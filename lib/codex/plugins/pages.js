var fs = require('fs')
  , fsp = fs.promises
  , path = require('path')
  , _ = require('../utils')
  , YAML = require('yaml');

module.exports = async function (project, config) {
  var dataDir = config.pages
    , outDir = project.config.outDir
    , results = await getFiles(config.pages)
    , fileNames = [];

  results.forEach(function (res) {
    var filename = path.basename(res).replace(path.extname(res), '');
    if (filename !== 'index') filename = filename + '/index';

    var outPath = (path.dirname(res) + '/' + filename + '.html').replace(dataDir, outDir)
      , href = path.dirname(outPath).replace(outDir, '') + '/'
      , shortName = res.replace(dataDir, '')
      , template = outPath.replace(outDir, '').split('/')[1].split('.')[0]
      , group = (shortName.split('/').length === 2) ? 'root' : template
      , markdown = fs.readFileSync(res, 'utf8')
      , frontMatter = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/)
      , defaults = {
            title: ''
          , template: template
          , 'render-file': true
        };

    if (frontMatter) {
      var props = YAML.parse(frontMatter[1]) || {};
      markdown = markdown.slice(frontMatter[0].length);
      defaults = _.defaults(props, defaults);
    }

    var result = {
        inPath: res
      , inFile: shortName
      , outPath: outPath
      , href: href
      , prepared: project.parseMarkdown(markdown)
    };

    fileNames.push(shortName);
    result = _.merge(defaults, result);
    if (result['render-file'])
      project.emit([ 'register', 'file' ], result);

    project.emit([ 'register', 'group' ], group, result);
  });

  project.emit('progress', {
      message: 'Found all markdown files.'
    , array: fileNames
  });

  return { name: 'pages' };
};

async function getFiles (base) {
  var results = []
    , list = await fsp.readdir(base, { withFileTypes: true });

  await Promise.all(list.map(async function (entry) {
    var file = path.join(base, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await getFiles(file));
      return;
    }

    var ext = path.extname(file).toLowerCase();
    if (ext === '.md' || ext === '.markdown')
      results.push(file);
  }));

  return results.sort();
}
