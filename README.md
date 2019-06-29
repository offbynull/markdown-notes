# MarkdownNotes

<p align="center"><img src ="logo.png" alt="MarkdownNotes logo" /></p>

Inspired by the lack of simple note taking tools for developers and engineers, MarkdownNotes is an ultra-simple yet extendable application for taking engineering/development notes in markdown. Why use MarkdownNotes over other note taking tools / markdown implementations?

* Bloat-free and cross-platform -- no built-in editors, UIs, cloud-support, etc..
* Ingests an extended form of CommonMark-flavoured markdown:
  * Supports embedding PlantUML diagrams.
  * Supports embedding DOT graphs (viz.js).
  * Supports embedding LaTeX math expressions (MathJax / KaTeX).
  * Supports automatic bookmarking.
  * Supports generating table of contents.
  * etc..
* Generates a single-file HTML output -- everything needed is embedded. 
* Provides a simple API for extending markdown -- write new markdown extensions as you need them.
* Provides a simple REPL loop -- immediately view changes as you make them.

## Usage

To setup MarkdownNotes...
1. clone the repository
1. ensure Java is installed (e.g. `sudo apt install openjdk-11-jdk`)
1. ensure GraphViz is installed (e.g. `sudo apt install graphviz`)
1. run `npm install`.

To run MarkdownNotes, run `npm start [path]` (where `[path]` is your work directory). A browser window will open to the rendered output of `[path]/input/input.md`. Any changes to any file in `[path]/input` will result in the rendered output being updated (scroll position will be maintained).

The rendered output is a self-contained HTML that can be accessed at `[path]/output/output.html`. 

## Syntax

The markdown syntax used by MarkdownNotes is an extended variant of CommonMark. Extensions are written either as fenced or inline code, where the language is set to the name of the extension. For example, to insert a MathJax expression...

````
```{mj}
\frac{a}{b}
```
````

For a comphensive overview of the built-in extensions, see [example/output/output.html](example/output/output.html) and [example/input/input.md](example/input/input.md).

## Extending

For each new extension, simply create a class that extends the `Extension` interface in [src/markdown/extender_plugin.ts](src/markdown/extender_plugin.ts) and register it with `extenderConfig` in [src/markdown/markdown.ts](src/markdown/markdown.ts). `Extension` is a simplified TypeScript interface for extending [markdown-it](https://github.com/markdown-it/markdown-it)'s markdown syntax. For example implementations, check out any file with a `_extension.ts` suffix in [src/markdown](src/markdown).
