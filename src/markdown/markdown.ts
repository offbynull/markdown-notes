/**
 * MarkdownNotes
 * Copyright (c) Kasra Faghihi, All rights reserved.
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.0 of the License, or (at your option) any later version.
 * 
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */

import FileSystemExtras from 'fs-extra';
import MarkdownIt from 'markdown-it';
import HighlightJs from 'highlight.js';
import { JSDOM } from 'jsdom';
import { extender, ExtenderConfig } from './extender_plugin';
import { TocExtension } from './table_of_contents_extension';
import { BookmarkExtension, BookmarkReferenceIgnoreExtension, BookmarkLinkerControllerExtension } from './bookmark_extension';
import { DotExtension } from './dot_graph_extension';
import { NoteExtension } from './note_extension';
import { MathJaxExtension } from './mathjax_extension';
import { TitleExtension } from './title_extension';
import { KatexExtension } from './katex_extension';
import { PlantUmlExtension } from './plantuml_extension';
import { CsvExtension } from './csv_extension';
import { PythonExtension } from './python_extension';
import { JavaExtension } from './java_extension';
import { NodeExtension } from './node_extension';
import { ImageExtension } from './image_extension';
import { ChemfigExtension } from './chemfig_extension';
import { MacroDefineExtension, MacroApplyNoopExtension } from './macro_extension';
import { OutputExtension } from './output_extension';

export default class Markdown {
    private readonly markdownIt: MarkdownIt;
    private readonly htmlBasePath: string;
    private readonly realBasePath: string;

    public constructor(realCachePath: string, realInputPath: string, htmlBasePath: string, realBasePath: string) {
        this.markdownIt = new MarkdownIt('commonmark', {
            highlight: (str, lang) => { // This just applies highlight.js classes -- CSS for classes applied in another area
                if (lang && HighlightJs.getLanguage(lang)) {
                    return '<pre class="hljs"><code>' + HighlightJs.highlight(lang, str).value + '</code></pre>';
                }
                return ''; // use external default escaping
            }
        }).enable([ 'table', 'strikethrough' ]);

        this.htmlBasePath = htmlBasePath;
        this.realBasePath = realBasePath;

        const extenderConfig: ExtenderConfig = new ExtenderConfig(realCachePath, realInputPath, realBasePath, htmlBasePath);
        extenderConfig.register(new TitleExtension());
        extenderConfig.register(new BookmarkExtension());
        extenderConfig.register(new BookmarkLinkerControllerExtension());
        extenderConfig.register(new BookmarkReferenceIgnoreExtension());
        extenderConfig.register(new TocExtension());
        extenderConfig.register(new DotExtension());
        extenderConfig.register(new NoteExtension());
        extenderConfig.register(new OutputExtension());
        extenderConfig.register(new ImageExtension());
        extenderConfig.register(new MathJaxExtension());
        extenderConfig.register(new KatexExtension());
        extenderConfig.register(new PlantUmlExtension());
        extenderConfig.register(new CsvExtension());
        extenderConfig.register(new PythonExtension());
        extenderConfig.register(new JavaExtension());
        extenderConfig.register(new NodeExtension());
        extenderConfig.register(new ChemfigExtension());
        extenderConfig.register(new MacroDefineExtension());
        extenderConfig.register(new MacroApplyNoopExtension());
        this.markdownIt.use(extender, extenderConfig);
        // this.markdownIt.use(indexer);
    }

    public render(markdown: string): string {
        const html = this.markdownIt.render(markdown);

        const jsDom = new JSDOM(html);
        const document = jsDom.window.document;

        const headElement = document.getElementsByTagName('head')[0];
        const bodyElement = document.getElementsByTagName('body')[0];


        // Apply meta tags
        const metaViewportElem = document.createElement('meta');
        metaViewportElem.setAttribute('name', 'viewport');
        metaViewportElem.setAttribute('content', 'width=device-width,initial-scale=1');
        headElement.appendChild(metaViewportElem);


        // Apply changes for github styling
        const githubMarkdownGenPath = `.temp_githib_css`;
        FileSystemExtras.ensureDirSync(this.realBasePath + '/' + githubMarkdownGenPath);
        FileSystemExtras.copySync('node_modules/github-markdown-css', this.realBasePath + '/' + githubMarkdownGenPath);
        const githubMarkdownHtmlPath = this.htmlBasePath + '/' + githubMarkdownGenPath;

        const githubCssElem = document.createElement('link');
        githubCssElem.setAttribute('href', githubMarkdownHtmlPath + '/github-markdown.css');
        githubCssElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(githubCssElem);

        bodyElement.classList.add('markdown-body');


        // Apply changes to highlight code blocks
        const highlightJsGenPath = `.temp_highlightjs_css`;
        FileSystemExtras.ensureDirSync(this.realBasePath + '/' + highlightJsGenPath);
        FileSystemExtras.copySync('node_modules/highlight.js/styles', this.realBasePath + '/' + highlightJsGenPath);
        const highlightJsHtmlPath = this.htmlBasePath + '/' + highlightJsGenPath;

        const highlightJsCssElem = document.createElement('link');
        highlightJsCssElem.setAttribute('href', highlightJsHtmlPath + '/default.css');
        highlightJsCssElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(highlightJsCssElem);


        // Dump to string
        return jsDom.serialize();
    }
}