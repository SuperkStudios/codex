var fs = require('fs')
  , path = require('path')
  , parseComments = require('comment-parser').parse
  , _ = require('../utils');

module.exports = async function (project, config) {
  var files = config.files || []
    , dataDir = project.config.dataDir
    , outDir = project.config.outDir;

  for (var i = 0; i < files.length; i++) {
    var file = files[i]
      , filename = path.resolve(dataDir, file.file);

    if (!await _.exists(filename)) continue;

    var source = fs.readFileSync(filename, 'utf8')
      , comments = parseCodeComments(project, source)
      , name = file.name
      , outPath = outDir + '/code/' + name + '.html'
      , href = path.dirname(outPath).replace(outDir, '') + '/' + name + '.html'
      , defaults = {
            title: ''
          , template: 'code'
          , 'render-file': true
        };

    defaults = _.defaults(file, defaults);
    var result = {
        title: file.title
      , description: project.parseMarkdown(file.description || '')
      , template: 'code'
      , outPath: outPath
      , href: href
      , prepared: comments
    };

    result = _.merge(defaults, result);
    project.emit([ 'register', 'file' ], result);
    project.emit([ 'register', 'group' ], 'code', result);
  }

  return { name: 'code' };
};

function parseCodeComments (project, source) {
  var parsed = parseComments(source)
    , codeBlocks = extractCodeBlocks(source);

  return parsed.map(function (comment, index) {
    var description = comment.description || ''
      , parts = description.split(/\n\s*\n/)
      , summary = parts.shift() || ''
      , body = parts.join('\n\n')
      , code = codeBlocks[index] || ''
      , ctx = parseContext(code);

    return {
        ignore: comment.tags.some(function (tag) { return tag.tag === 'ignore'; })
      , anchor: anchorFor(comment, ctx, index)
      , description: {
            full: project.parseMarkdown(description)
          , summary: project.parseMarkdown(summary)
          , body: project.parseMarkdown(body)
        }
      , ctx: ctx
      , tags: comment.tags.map(normalizeTag)
      , code: code
    };
  });
}

function extractCodeBlocks (source) {
  var blocks = []
    , pattern = /\/\*\*[\s\S]*?\*\/\s*([\s\S]*?)(?=\/\*\*|$)/g
    , match;

  while ((match = pattern.exec(source)))
    blocks.push((match[1] || '').trim());

  return blocks;
}

function parseContext (code) {
  var line = (code || '').split('\n').filter(Boolean)[0] || ''
    , fn = line.match(/function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)/)
    , assignment = line.match(/(?:exports\.|module\.exports\.)([A-Za-z0-9_$]+)\s*=\s*function\s*\(([^)]*)\)/);

  if (fn) return { name: fn[1], string: fn[1] + '(' + fn[2] + ')' };
  if (assignment) return { name: assignment[1], string: assignment[1] + '(' + assignment[2] + ')' };

  return line ? { string: line } : null;
}

function anchorFor (comment, ctx, index) {
  var nameTag = comment.tags.filter(function (tag) { return tag.tag === 'name'; })[0];
  return (nameTag && nameTag.name) || (ctx && ctx.name) || ('comment-' + index);
}

function normalizeTag (tag) {
  if (tag.tag === 'param') {
    return {
        type: 'param'
      , types: tag.type ? [ tag.type ] : []
      , name: tag.name || ''
      , description: tag.description || ''
    };
  }

  if (tag.tag === 'api') {
    return {
        type: 'api'
      , visibility: tag.name || tag.description || ''
    };
  }

  if (tag.tag === 'see') {
    return {
        type: 'see'
      , local: tag.name || tag.description || ''
    };
  }

  if (tag.tag === 'name') {
    return {
        type: 'name'
      , name: tag.name || tag.description || ''
    };
  }

  return {
      type: tag.tag
    , name: tag.name || ''
    , description: tag.description || ''
    , types: tag.type ? [ tag.type ] : []
  };
}
