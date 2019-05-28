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
import { Extension, TokenIdentifier, Type } from "./extender_plugin";
import * as Katex from 'katex';
import { JSDOM } from 'jsdom';

const KATEX_INSERTED = 'katex_inserted';

export class KatexExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('kt', Type.BLOCK),
        new TokenIdentifier('kt', Type.INLINE)
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const token = tokens[tokenIdx];
        const tex = token.content;

        context.set(KATEX_INSERTED, true);
        const html = Katex.renderToString(
            tex,
            {
                displayMode: token.block,
                throwOnError: false
            }
        );
        return html;
    }

    public postHtml(dom: JSDOM, context: Map<string, any>): JSDOM {
        if (!context.has(KATEX_INSERTED)) {
            return dom;
        }
    
        const document = dom.window.document;
    
    
        const headElement = document.getElementsByTagName('head')[0];

        const linkElem = document.createElement('link');
        linkElem.setAttribute('href', 'node_modules/katex/dist/katex.min.css');
        linkElem.setAttribute('rel', 'stylesheet');
        headElement.appendChild(linkElem);

        // You only need this for browser-side rendering -- we're doing server-side rendering here.
        // const scriptElem = document.createElement('script');
        // scriptElem.setAttribute('type', 'text/javascript');
        // scriptElem.setAttribute('src', 'node_modules/katex/dist/katex.js');
        // headElement.appendChild(scriptElem);

        return dom;
    }
}