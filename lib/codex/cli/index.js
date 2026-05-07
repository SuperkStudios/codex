var http = require('http')
  , serveStatic = require('serve-static')
  , finalhandler = require('finalhandler')
  , fs = require('fs')
  , path = require('path')
  , join = path.join
  , Eventer = require('../eventer')
  , colors = require('./colors');

var codex = require('../../codex')
  , Project = require('../project')
  , _ = require('../utils');

var cli = module.exports = new Eventer();

function pad(str, width) {
  return Array(Math.max(width - str.length, 0) + 1).join(' ') + str;
}

var help = [
  { name: 'build'
  , description: 'Render your codex.'
  , options: [
        { '-i, --in [inDir]': 'Specify the project root directory instead of [cwd].' }
      , { '-o, --out [outDir]': 'Specify the path where generated files should placed' }
      , { '-t, --template [templateDir]': 'Specify the path to use as the project template' }
      , { '-d, --data [dataDir]': 'Specify the location where project data files are located' }
    ]
  },
  { name: 'watch'
  , description: 'Automatically regenerate if data or templates change.'
  , options: [
        { '-i, --in [inDir]': 'Specify the project root directory instead of [cwd].' }
      , { '-o, --out [outDir]': 'Specify the path where generated files should placed' }
      , { '-t, --template [templateDir]': 'Specify the path to use as the project template' }
      , { '-d, --data [dataDir]': 'Specify the location where project data files are located' }
      , { '-p, --port [n]': 'Specify port. Defaults to 1227.' }
      , { '-m, --mount [base]': 'Specify the folder path to mount the static server at.' }
    ]
  },
  { name: 'serve'
  , description: 'Starts a static server to view the generated files.'
  , options: [
        { '-p, --port [n]': 'Specify port. Defaults to 1227.' }
      , { '-d, --dir [outDir]': 'Specify the directory to serve.' }
      , { '-m, --mount [base]': 'Specify the folder path to mount the static server at.' }
    ]
  },
  { name: 'skeleton [name]'
  , description: 'Create a skeleton site using the codex provided template'
  }
];

cli.on('--version', function () {
  console.log(codex.version);
});

cli.on('--help', function () {
  var i = function (s) { console.log('  ' + s); };

  i('');
  i('CODEX HELP'.magenta);
  i('');
  i('Options Defaults');
  i('   inDir:       '.red + '[cwd]'.gray);
  i('   outDir:      '.red + '[cwd]/out'.gray);
  i('   dataDir:     '.red + '[cwd]/data'.gray);
  i('   templateDir: '.red + '[cwd]/template'.gray);
  i('');

  help.forEach(function (c) {
    i(c.description.blue);
    i(pad('', 4) + 'codex '.gray + c.name.green + (c.options ? ' <options>' : ''));

    if (c.options) {
      c.options.forEach(function (option) {
        for (var opt in option)
          i(pad('', 6) + opt + ' ' + option[opt].gray);
      });
    }
    i('');
  });

  process.exit();
});

cli.on('build', function (args) {
  header();
  var opts = projectOptions(args);

  log('info', '');
  log('info', 'Loaded configuration...'.blue);
  logObject('info', opts);
  log('info', '');

  var project = new Project(opts);
  attachProjectLogging(project, true);

  project.build(function (err) {
    if (err) return footerNotOk();
    log('info', 'Codex build cycle complete.');
    footerOk();
  });
});

cli.on('serve', function (args) {
  header();
  var dir = args.d || args.dir || args.o || args.out;
  if (!dir) {
    dir = join(args.cwd, 'out');
  } else if (!_.isPathAbsolute(dir)) {
    dir = path.resolve(args.cwd, dir);
  }

  var port = args.p || args.port || 1227
    , mount = args.m || args.mount || ''
    , serve = serveStatic(dir, { fallthrough: false })
    , server = http.createServer(function (req, res) {
        if (mount && req.url.indexOf(mount) !== 0) {
          res.statusCode = 404;
          return res.end('Not found');
        }

        if (mount) req.url = req.url.slice(mount.length) || '/';
        serve(req, res, finalhandler(req, res));
      });

  server.listen(port);
  log('info', 'Static server running on port ['.gray + port.toString().green + ']'.gray);
  log('info', 'Serving dir: ' + dir.gray);
  if (mount !== '')
    log('info', 'on mount point:' + mount.gray);
});

cli.on('skeleton', function () {
  header();
  log('warn', 'No skeleton project name provided. See help for more info.');
  footerNotOk();
});

cli.on('skeleton *', function (args) {
  header();
  var dir = args._[1];
  if (!_.isPathAbsolute(dir))
    dir = path.resolve(args.cwd, dir);

  if (fs.existsSync(dir)) {
    log('error', 'Skeleton folder already exists.');
    log('error', dir);
    footerNotOk();
  }

  fs.cp(join(__dirname, '..', '..', '..', 'skeleton'), dir, { recursive: true }, function (err) {
    if (err) {
      log('error', err.message);
      footerNotOk();
    }

    log('info', 'Skeleton successfully created'.blue);
    log('info', dir);
    footerOk();
  });
});

cli.on('watch', function (args) {
  header();
  var opts = projectOptions(args);

  log('info', '');
  log('info', 'Loaded configuration...'.blue);
  logObject('info', opts);
  log('info', '');

  cli.emit('serve', {
      d: opts.outDir
    , cwd: args.cwd
    , p: args.p
    , port: args.port
    , m: args.m
    , mount: args.mount
  });

  log('info', 'Starting watch session...');

  var project = new Project(opts);
  attachProjectLogging(project, false);

  function rebuild() {
    project.flush();
    project.build(function (err) {
      if (err) return;
      log('info', 'Project rebuilt successfully');
      log('info', 'Watching...');
    });
  }

  fs.watch(opts.dataDir, { recursive: true }, rebuild);
  fs.watch(opts.templateDir, { recursive: true }, rebuild);
  rebuild();
});

function projectOptions (args) {
  var inDir = args.i || args.in || args.cwd
    , opts = {
          inDir: inDir
        , outDir: args.o || args.out || join(inDir, 'out')
        , dataDir: args.d || args.data || join(inDir, 'data')
        , templateDir: args.t || args.template || join(inDir, 'template')
      };

  for (var dir in opts) {
    if (!_.isPathAbsolute(opts[dir]))
      opts[dir] = path.resolve(args.cwd, opts[dir]);
  }

  return opts;
}

function attachProjectLogging (project, exitOnError) {
  project.on('error', function (d) {
    log('error', d.message || d);
    if (d.data) logObject('error', d.data);
    if (exitOnError) footerNotOk();
  });

  project.on('progress', function (d) {
    if (d.message) log('info', d.message.blue);
    if (d.data) logObject('info', d.data);
    if (d.array) logArray('info', d.array);
    log('info', '');
  });
}

function padAfter (str, len) {
  return str + Array(Math.max(len - str.length, 0) + 1).join(' ');
}

function logArray (t, arr) {
  arr.forEach(function (line) {
    log(t, line.gray);
  });
}

function logObject (t, obj) {
  var longest = 0;
  for (var name in obj)
    if (name.length > longest) longest = name.length;

  for (var key in obj)
    log(t, padAfter(key + ':', longest + 4) + String(obj[key]).gray);
}

function log (level, msg) {
  var method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](msg);
}

function header() {
  log('info', 'Codex'.blue + ' v'.gray + codex.version.gray);
  log('info', 'It works if it ends with ' + 'Codex '.gray + 'ok'.green);
}

function footerOk() {
  log('info', 'Codex '.gray + 'ok'.green);
  process.exit();
}

function footerNotOk() {
  log('warn', 'Codex '.gray + 'not ok'.red);
  process.exit(1);
}
