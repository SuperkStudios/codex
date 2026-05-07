var fs = require('fs')
  , fsp = fs.promises
  , path = require('path')
  , join = path.join
  , util = require('util')
  , _ = require('./utils')
  , Eventer = require('./eventer')
  , pug = require('pug')
  , stylus = require('stylus')
  , markedPkg = require('marked')
  , highlight = require('highlight.js');

var marked = markedPkg.marked || markedPkg;

module.exports = Project;

function Project (config) {
  Eventer.call(this);
  this.config = _.defaults(config || {}, {
      clean: false
    , locals: {}
  });

  this.groups = {};
  this.files = [];

  var self = this;
  this.on([ 'register', 'file' ], function (file) {
    file.project = self.config.locals;
    self.files.push(file);
  });

  this.on([ 'register', 'group' ], function (group, specs) {
    var _group = self.groups[group] || (self.groups[group] = []);
    _group.push(specs);
  });
}

util.inherits(Project, Eventer);

Project.prototype.parseMarkdown = function (text) {
  var tokens = marked.lexer(text || '');

  marked.walkTokens(tokens, function (token) {
    if (token.type !== 'code') return;

    var lang = token.lang || 'javascript';
    if (lang === 'js') lang = 'javascript';

    try {
      token.text = highlight.getLanguage(lang)
        ? highlight.highlight(token.text, { language: lang }).value
        : highlight.highlightAuto(token.text).value;
      token.escaped = true;
    } catch (err) {
      token.text = highlight.highlightAuto(token.text).value;
      token.escaped = true;
    }
  });

  return marked.parser(tokens);
};

Project.prototype.build = function (cb) {
  cb = cb || function () {};

  this._build()
    .then(function () {
      this.emit('done');
      cb();
    }.bind(this))
    .catch(function (e) {
      this.emit('error', e);
      cb(e);
    }.bind(this));
};

Project.prototype._build = async function () {
  var stack = [
      'assertFolders'
    , 'loadConfigFile'
    , 'loadPlugins'
    , 'getFiles'
    , 'ensureOutFolders'
    , 'renderFiles'
    , 'moveAssets'
  ];

  for (var i = 0; i < stack.length; i++) {
    await this[stack[i]]();
  }
};

Project.prototype.assertFolders = async function () {
  var config = this.config;

  if (!await _.exists(config.inDir))
    throw new Error('Input directory does not exist.');

  if (!config.templateDir)
    config.templateDir = path.join(config.inDir, 'template');
  if (!config.dataDir)
    config.dataDir = path.join(config.inDir, 'data');

  if (!await _.exists(config.templateDir))
    throw new Error('Template directory does not exist.');

  if (!config.outDir)
    config.outDir = path.join(config.inDir, 'out');

  if (config.clean === true)
    await fsp.rm(config.outDir, { recursive: true, force: true });

  await _.mkdir(config.outDir);
};

Project.prototype.loadConfigFile = async function () {
  var config = this.config
    , confFile = path.join(config.dataDir, 'codex.json');

  if (!await _.exists(confFile)) return;

  var conf = JSON.parse(await fsp.readFile(confFile, 'utf8'));
  this.config = _.merge(config, conf);
  this.config.locals = this.config.locals || {};

  if (this.config.locals.description)
    this.config.locals.description = this.parseMarkdown(this.config.locals.description);
};

Project.prototype.loadPlugins = async function () {
  var stack = [];

  stack.push({
      name: 'pages'
    , templates: path.join(this.config.inDir, 'template')
    , pages: path.join(this.config.inDir, 'data')
  });

  if (Array.isArray(this.config.plugins))
    stack = stack.concat(this.config.plugins);

  for (var i = 0; i < stack.length; i++) {
    var middleware = stack[i]
      , mw
      , err;

    if (/^[a-z0-9_-]+$/i.test(middleware.name)
      && fs.existsSync(path.join(__dirname, 'plugins', middleware.name + '.js'))) {
      mw = require('./plugins/' + middleware.name);
    } else {
      try {
        mw = require(middleware.name);
      } catch (reqErr) {
        err = reqErr;
      }
    }

    if (!mw || typeof mw !== 'function') {
      this.emit([ 'plugin', 'failed', middleware.name ], {
          name: middleware.name
        , err: err || new Error('Unable to load plugin')
      });
      throw err || new Error('Unable to load plugin: ' + middleware.name);
    }

    var res = await mw(this, middleware);
    this.emit([ 'plugin', 'loaded', res.name ], res);
  }
};

Project.prototype.sortGroups = function () {
  for (var g in this.groups) {
    this.groups[g].sort(function (a, b) {
      return a.weight - b.weight;
    });
  }
};

Project.prototype.getFiles = async function () {};

Project.prototype.ensureOutFolders = async function () {
  var dirs = {};

  this.files.forEach(function (file) {
    dirs[path.dirname(file.outPath)] = true;
  });

  await Promise.all(Object.keys(dirs).map(function (dir) {
    return _.mkdir(dir, 0o755);
  }));
};

Project.prototype.renderFiles = async function () {
  var self = this;
  this.sortGroups();

  await Promise.all(this.files.map(async function (file) {
    if (file['render-file'] === false) return;

    var template = join(self.config.templateDir, file.template + '.jade');
    if (!await _.exists(template)) {
      self.emit('error', {
          message: 'Missing Template'
        , data: template
      });
      return;
    }

    var locals = {
        filename: template
      , file: file
      , pretty: true
      , site: self.config.locals
      , files: self.groups
    };

    var source = await fsp.readFile(template, 'utf8')
      , html = pug.render(normalizeJade(source), locals);

    await fsp.writeFile(locals.file.outPath, html, 'utf8');
    self.emit('progress', {
        message: 'Page rendered successfully'
      , step: 'render'
      , data: { path: locals.file.outPath }
    });
  }));
};

Project.prototype.moveAssets = async function () {
  var assetIn = join(this.config.templateDir, 'assets')
    , assetOut = join(this.config.outDir, 'public')
    , stylusIn = join(this.config.templateDir, 'stylus', 'main.styl')
    , stylusOut = join(this.config.outDir, 'public', 'css', 'main.css');

  await _.mkdir(path.join(assetOut, 'css'), 0o755);

  if (await _.exists(assetIn)) {
    await fsp.cp(assetIn, assetOut, { recursive: true, force: true });
    this.emit('progress', {
        message: 'Assets moved'
      , step: 'assets'
      , data: {
            pathIn: assetIn
          , pathOut: assetOut
        }
    });
  }

  var src = await fsp.readFile(stylusIn, 'utf8')
    , renderer = stylus(src)
        .set('filename', stylusIn)
        .include(require('nib').path)
    , css = await new Promise(function (resolve, reject) {
        renderer.render(function (err, result) {
          if (err) return reject(err);
          resolve(result);
        });
      });

  await fsp.writeFile(stylusOut, css, 'utf8');
  this.emit('progress', {
      message: 'Stylus rendered'
    , step: 'stylus'
    , data: { path: stylusOut }
  });
};

Project.prototype.flush = function () {
  this.groups = {};
  this.files = [];
};

Project.prototype.LANGUAGES = highlight.listLanguages();

function normalizeJade (source) {
  return source
    .replace(/^!!!5\s*$/gm, 'doctype html')
    .replace(/^(\s*extends\s+)([^.\s][^\s]*)\s*$/gm, function (_, prefix, name) {
      return prefix + name + '.jade';
    });
}
