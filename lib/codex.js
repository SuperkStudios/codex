var Project = require('./codex/project');

var exports = module.exports = function (opts) {
  var proj = new Project(opts);
  return proj;
};

exports.version = require('../package.json').version;
