# MarkdownNotes

<p align="center"><img src ="logo.png" alt="MarkdownNotes logo" /></p>

Inspired by the lack of simple note taking tools for developers and engineers, MarkdownNotes is an ultra-simple yet extendable application for taking engineering notes in markdown. Why use MarkdownNotes over other note taking tools / markdown implementations?

* Bloat-free and cross-platform -- no built-in user interfaces, editors, or clouds.
* Engineering-focused features:
  * Tables: CSV and TSV tables.
  * Math typesetting: MathJax and KaTeX.
  * Diagramming languages: GraphViz and PlantUML.
  * Programming languages: Python, Node, and Java.
  * Indexing: Table of contents and bookmarks (automatic linking).
  * Inline image annotations.
  * etc..
* Single-file HTML output -- everything needed is embedded. 
* Simple REPL loop -- changes rendered immediately.
* Simple API -- easily add new markdown extensions.

The flavour of Markdown extended by MarkdownNotes is [CommonMark](https://commonmark.org/). 

## Usage

To setup MarkdownNotes...

1. clone the repository.
1. ensure [buildah](https://github.com/containers/buildah/blob/master/install.md) and [runc](https://github.com/opencontainers/runc) are installed.
1. ensure [NodeJS](https://nodejs.org) is installed.
1. run `npm install`.

To run MarkdownNotes, run `npm start -- [path]` (where `[path]` is your work directory). A browser window will open to the rendered output of `[path]/input/input.md`. Any changes to any file in `[path]/input` will result in the rendered output being updated (scroll position will be maintained).

The rendered output is a self-contained HTML file located at `[path]/output/output.html`. 


**WARNING**: You may have issues installing buildah on Ubuntu 18+. If the projectatomic PPA doesn't register with Ubuntu, you'll need to tell Ubuntu to reference the PPA as if it were an older version of Ubuntu. Open the *Software & Updates* application, go to the *Other Updates* tab, and edit the *projectatomic* entry such that the *distribution* points to an earlier release of Ubuntu (e.g. bionic). Once that's done, try performing the installation instructions again.

## Syntax

The markdown syntax used by MarkdownNotes is an extended variant of CommonMark. Extensions are written either as fenced or inline code, where the language is set to the name of the extension. For example, to insert a MathJax expression...

````
```{mj}
\frac{a}{b}
```
````

For a comphensive overview of the built-in extensions, see the example [output](example/output/output.html) and [input](example/input/input.md).

## Extending

For each new extension, simply create a class that extends the `Extension` interface in [src/markdown/extender_plugin.ts](src/markdown/extender_plugin.ts) and register it with `extenderConfig` in [src/markdown/markdown.ts](src/markdown/markdown.ts). `Extension` is a simplified TypeScript interface for extending [markdown-it](https://github.com/markdown-it/markdown-it)'s markdown syntax. For example implementations, check out any file with a `_extension.ts` suffix in [src/markdown](src/markdown).
