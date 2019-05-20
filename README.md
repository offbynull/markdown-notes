# MarkdownNotes

Inspired by the lack of simple note taking tools for developers and engineers, MarkdownNotes is an ultra-simple yet extendable application for taking engineering/development notes in markdown. Why use MarkdownNotes over other note taking tools and markdown implementations?

* Bloat-free and cross-platform -- no built-in editors, UIs, cloud-support, etc..
* Ingests an extended form of CommonMark-flavoured markdown:
  * Supports embedding DOT graphs (viz.js).
  * Supports embedding LaTeX math expressions (MathJax).
  * Supports automatic bookmarking.
  * Supports generating table of contents.
  * etc..
* Generates a single-file HTML output -- everything needed is embedded. 
* Provides a simple API for extending markdown -- write new markdown extensions as you need them.
* Provides a simple REPL loop -- immediately view changes as you make them.

## Usage

To setup MarkdownNotes, clone the repository and run `npm install`.

To run MarkdownNotes, run `npm start`. A browser window will open to the rendered output of [input/input.md](input/input.md), and any changes to [input/input.md](input/input.md) or any other file in [input/](input/) will result in the rendered output being updated (scroll position will be maintained).

The rendered output can always be accessed at [output/output.html](output/output.html).

## Syntax

The markdown syntax used by MarkdownNotes is an extended variant of CommonMark. Extensions are written either as fenced or inline code, where the language is set to the name of the extension. For example, to insert a MathJax expression...

````
```{mj}
\frac{a}{b}
```
````

For a comphensive overview of the built-in extensions, see the default [output/output.html](output/output.html) file and/or [input/input.md](input/input.md) file.

## Extending

For each new extension, simply create a class that extends the `Extension` interface in [src/markdown/extender_plugin.ts](src/markdown/extender_plugin.ts) and register it with `extenderConfig` in [src/markdown/markdown.ts](src/markdown/markdown.ts). `Extension` is a simplified TypeScript interface for extending [markdown-it](https://github.com/markdown-it/markdown-it)'s markdown syntax. For example implementations, check out any file with a `_extension.ts` suffix in [src/markdown](src/markdown).
