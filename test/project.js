var test = require('node:test')
  , assert = require('node:assert/strict')
  , path = require('path')
  , fs = require('fs')
  , codex = require('..');

var out = path.join(__dirname, 'fixture', 'out')
  , temp = path.join(__dirname, 'fixture', 'template');

test('Project exposes a semver version', function () {
  assert.match(codex.version, /\d+\.\d+\.\d+$/);
});

test('Project correctly initializes', function () {
  var project = codex({
      locals: {
        title: 'Hello Universe'
      }
    , inDir: path.join(__dirname, 'fixture')
  });

  assert.ok(project.config.inDir);
});

test('Project correctly sets up folders', async function () {
  var project = codex({
      locals: {
        title: 'Hello Universe'
      }
    , inDir: path.join(__dirname, 'fixture')
  });

  await project.assertFolders();

  assert.equal(project.config.outDir, out);
  assert.equal(project.config.templateDir, temp);
  assert.equal(fs.existsSync(out), true);
});

test('Project correctly builds', async function () {
  var project = codex({
      locals: {
        title: 'Hello Universe'
      }
    , inDir: path.join(__dirname, 'fixture')
    , clean: true
  });

  await project._build();

  assert.equal(fs.existsSync(out), true);
  assert.equal(fs.existsSync(path.join(out, 'public/css/main.css')), true);
});

test.after(async function () {
  await fs.promises.rm(out, { recursive: true, force: true });
});
