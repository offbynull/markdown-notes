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

export class TitleExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('title', Type.BLOCK),
        new TokenIdentifier('title', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext): void {
        const existingTitle = context.shared.get('title');
        if (existingTitle !== undefined) {
            throw 'Title already set to ' + existingTitle;
        }

        const title = token.content;
        context.shared.set('title', title);
    }

    public postHtml(dom: JSDOM, context: ExtensionContext) {
        const title = context.shared.get('title');
        if (title === undefined) {
            return;
        }

        const document = dom.window.document;
        const headElement = document.getElementsByTagName('head')[0];

        const titleElem = document.createElement('title');
        titleElem.text = title;
        headElement.appendChild(titleElem);
    }
}