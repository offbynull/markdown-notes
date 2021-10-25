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
import { BookmarkExtension, BookmarkReferenceIgnoreExtension, BookmarkLinkerControllerExtension, BookmarkReferenceTargetExtension } from './bookmark_extension';
import { TitleExtension } from './title_extension';
import { MacroDefinition } from './macro_helper';
import { CustomMacroExtension } from './custom_macro_extension';

export default class Markdown {
    private readonly markdownIt: MarkdownIt;
    private readonly htmlBasePath: string;
    private readonly realBasePath: string;

    public constructor(
        realMachineCachePath: string,
        realOldRenderCachePath: string,
        realNewRenderCachePath: string,
        realInputPath: string,
        htmlBasePath: string,
        realBasePath: string,
        customMacroDefinitions: MacroDefinition[]
    ) {
        this.markdownIt = new MarkdownIt('commonmark', {
            highlight: (str, lang) => { // This just applies highlight.js classes -- CSS for classes applied in another area
                if (lang && HighlightJs.getLanguage(lang)) {
                    return '<pre class="hljs"><code>' + HighlightJs.highlight(str, { language: lang }).value + '</code></pre>';
                }
                return ''; // use external default escaping
            }
        }).enable([ 'table', 'strikethrough' ]);

        this.htmlBasePath = htmlBasePath;
        this.realBasePath = realBasePath;

        const extenderConfig: ExtenderConfig = new ExtenderConfig(realMachineCachePath, realOldRenderCachePath, realNewRenderCachePath, realInputPath, realBasePath, htmlBasePath);
        extenderConfig.register(new TitleExtension());
        extenderConfig.register(new BookmarkExtension());
        extenderConfig.register(new BookmarkLinkerControllerExtension());
        extenderConfig.register(new BookmarkReferenceTargetExtension());
        extenderConfig.register(new BookmarkReferenceIgnoreExtension());
        extenderConfig.register(new TocExtension());

        for (const customMacroDefinition of customMacroDefinitions) {
            extenderConfig.register(new CustomMacroExtension(customMacroDefinition));
        }

        this.markdownIt.use(extender, extenderConfig);
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
        const githubMarkdownHtmlPath = (this.htmlBasePath === '' ? '' : this.htmlBasePath + '/') + githubMarkdownGenPath;

        const githubCssElem = document.createElement('link');
        githubCssElem.setAttribute('href', githubMarkdownHtmlPath + '/github-markdown.css');
        githubCssElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(githubCssElem);

        bodyElement.classList.add('markdown-body');


        // Apply changes to highlight code blocks
        const highlightJsGenPath = `.temp_highlightjs_css`;
        FileSystemExtras.ensureDirSync(this.realBasePath + '/' + highlightJsGenPath);
        FileSystemExtras.copySync('node_modules/highlight.js/styles', this.realBasePath + '/' + highlightJsGenPath);
        const highlightJsHtmlPath = (this.htmlBasePath === '' ? '' : this.htmlBasePath + '/') + highlightJsGenPath;

        const highlightJsCssElem = document.createElement('link');
        highlightJsCssElem.setAttribute('href', highlightJsHtmlPath + '/default.css');
        highlightJsCssElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(highlightJsCssElem);


        // Dump to string
        return jsDom.serialize();
    }
}