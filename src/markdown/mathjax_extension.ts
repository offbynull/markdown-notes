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
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type, ExtensionContext } from "./extender_plugin";
import { JSDOM } from 'jsdom';

const MATHJAX_INSERTED = 'mathjax_inserted';

export class MathJaxExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('mj', Type.BLOCK),
        new TokenIdentifier('mj', Type.INLINE)
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        let tex = token.content;

        context.shared.set(MATHJAX_INSERTED, true);
        if (token.block === true) {
            tex = tex.replace(/\$\$/g, '\\$\\$'); // escape boundary markers that appear in text ($$ -> \$\$)
            tex = '$$' + tex + '$$'; // add boundary markers to front and end
            return '<div class="mathjax">' + markdownIt.utils.escapeHtml(tex) + '</div>';
        } else {
            tex = tex.replace(/\$/g, '\\$'); // escape boundary markers that appear in text ($ -> \$)
            tex = '$' + tex + '$'; // add boundary markers to front and end
            return '<span class="mathjax">' + markdownIt.utils.escapeHtml(tex) + '</span>';
        }
    }

    public postHtml(dom: JSDOM, context: ExtensionContext) {
        if (!context.shared.has(MATHJAX_INSERTED)) {
            return;
        }
    
        const document = dom.window.document;
    
    
        const bodyElement = document.getElementsByTagName('body')[0];
        if (!bodyElement.classList.contains('no-mathjax')) {
            bodyElement.classList.add('no-mathjax');
        }
    
    
        const headElement = document.getElementsByTagName('head')[0];
    
        const mjConfigScriptElem = document.createElement('script');
        mjConfigScriptElem.setAttribute('type', 'text/x-mathjax-config');
        mjConfigScriptElem.textContent = `
            MathJax.Hub.Config({
                // extensions: ["tex2jax.js"],
                // jax: ["input/TeX","output/HTML-CSS"],
                tex2jax: {
                    displayMath: [ ['$$','$$'] ],
                    inlineMath: [ ["$","$"] ],
                    processEscapes: true,
                    processRefs: false,
                    processEnvironments: false,
                    processClass: "mathjax",
                    ignoreClass: "no-mathjax"
                }
            });
        `;
        headElement.appendChild(mjConfigScriptElem);
 
        // This isn't using normal MathJax, but the MathJax single-file bundle provided at https://github.com/pkra/MathJax-single-file. It
        // was installed as a Node module using npm install --save pkra/MathJax-single-file#12.0.0 (npm defaults to accessing github
        // whenever this syntax is used).
        const mathjaxHtmlPath = context.injectDir('node_modules/mathjax-single-file/dist/TeXSVGTeX/');
        const mjScriptElem = document.createElement('script');
        mjScriptElem.setAttribute('type', 'text/javascript');
        mjScriptElem.setAttribute('src', mathjaxHtmlPath + '/MathJax.js');
        headElement.appendChild(mjScriptElem);
    }
}