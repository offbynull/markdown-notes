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

import MarkdownIt from 'markdown-it';
import HighlightJs from 'highlight.js';

import { extender, ExtenderConfig } from './extender_plugin';
import { TocExtension } from './table_of_contents_extension';
import { BookmarkExtension, BookmarkReferenceIgnoreExtension } from './bookmark_extension';
import { DotExtension } from './dot_graph_extension';
import { NoteExtension } from './note_extension';
import { MathJaxExtension } from './mathjax_extension';
import { TitleExtension } from './title_extension';
import { JSDOM } from 'jsdom';

export default class Markdown {
    private readonly markdownIt: MarkdownIt;

    public constructor() {
        this.markdownIt = new MarkdownIt('commonmark', {
            highlight: (str, lang) => { // This just applies highlight.js classes -- CSS for classes applied in another area
                if (lang && HighlightJs.getLanguage(lang)) {
                    return '<pre class="hljs"><code>' + HighlightJs.highlight(lang, str).value + '</code></pre>';
                }
                return ''; // use external default escaping
            }
        });

        const extenderConfig: ExtenderConfig = new ExtenderConfig();
        extenderConfig.register(new TitleExtension());
        extenderConfig.register(new BookmarkExtension());
        extenderConfig.register(new BookmarkReferenceIgnoreExtension());
        extenderConfig.register(new TocExtension());
        extenderConfig.register(new DotExtension());
        extenderConfig.register(new NoteExtension());
        extenderConfig.register(new MathJaxExtension());
        this.markdownIt.use(extender, extenderConfig);
        // this.markdownIt.use(indexer);
    }

    public render(markdown: string): string {
        const html = this.markdownIt.render(markdown);

        const jsDom = new JSDOM(html);
        const document = jsDom.window.document;

        const headElement = document.getElementsByTagName('head')[0];
        const bodyElement = document.getElementsByTagName('body')[0];

        // Apply changes for github styling
        const githubCssElem = document.createElement('link');
        githubCssElem.setAttribute('href', 'node_modules/github-markdown-css/github-markdown.css');
        githubCssElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(githubCssElem);

        bodyElement.classList.add('markdown-body');

        // Apply changes to highlight code blocks
        const highlightJsCssElem = document.createElement('link');
        highlightJsCssElem.setAttribute('href', 'node_modules/highlight.js/styles/default.css');
        highlightJsCssElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(highlightJsCssElem);

        return jsDom.serialize();
    }
}