var path = require('path')
  , fs = require('fs')
  , fsp = fs.promises
  , exports = module.exports = {};

exports.isPathAbsolute = function (_path) {
  return path.isAbsolute(_path);
};

exports.existsSync = fs.existsSync;

exports.exists = function (_path, callback) {
  var promise = fsp.access(_path)
    .then(function () { return true; })
    .catch(function () { return false; });

  if (callback) {
    promise.then(callback);
    return;
  }

  return promise;
};

exports.mkdir = function (_path, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode = 0o755;
  }

  var promise = fsp.mkdir(path.resolve(_path), {
      recursive: true
    , mode: mode || 0o755
  });

  if (callback) {
    promise.then(function () { callback(null); }, callback);
    return;
  }

  return promise;
};
