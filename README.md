# Codex

> Generate static websites using Markdown, Pug-compatible Jade templates, and Stylus.

Codex is a simple tool for building static websites. It takes templates written in the
classic Jade syntax, renders them with modern [Pug](https://pugjs.org), compiles
[Stylus](https://stylus-lang.com/) styles, and applies everything to a collection of
Markdown documents. The result is a complete HTML site that can be hosted by any static
web server or on GitHub Pages.

This package now targets Node.js 20 and uses maintained runtime dependencies for Markdown
rendering, syntax highlighting, YAML front matter, template rendering, static serving,
and filesystem work.

### Features

* Skeleton project template
* Command-line or API based project configuration and building
* Plugin based loading system for advanced features
* Includes `code` plugin for generating document sites for javascript/node.js projects.

### Sites by Codex

* [Chaijs.com](http://chaijs.com) - Chai is an assertion library for javascript projects. It's
documentation was built by Codex and uses the `code` plugin extensively.

## Installation

You can install Codex through npm. Global installation is recommended for new projects.

```sh
npm install codex -g
```

## First Project

```sh
codex skeleton my-project
cd my-project
codex watch -p 1227
```

Using the `watch` command automatically regenerates your site every time Codex detects
a change in either your template or data folders.

## CLI Usage

There are a number of options available for the command line interface...

```sh
codex --help
codex build --in ./site --out ./site/out
codex serve --dir ./site/out --port 1227
codex watch --in ./site --port 1227
```

## Code Plugin

... coming soon

## Getting Help

Please post issues or questions to [GitHub Issues](https://github.com/logicalparadox/codex/issues).

## License

(The MIT License)

Copyright (c) 2011 Jake Luer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
