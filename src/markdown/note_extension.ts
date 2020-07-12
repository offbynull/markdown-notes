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
import StateCore from 'markdown-it/lib/rules_core/state_core';
import StateBlock from 'markdown-it/lib/rules_block/state_block';

export class NoteExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('note', Type.BLOCK)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext, state: Object) {
        const content = token.content;

        const newTokens: Token[] = [];
        const stateSb = state as StateBlock
        stateSb.md.block.parse(content, stateSb.md, stateSb.env, newTokens);

        let newToken;

        newToken = stateSb.push('note_open', 'div', 1);
        newToken.attrSet('style', 'margin: 2em; background-color: #e0e0e0');
        newToken = stateSb.push('notepreamb_open', 'strong', 1);
        newToken = stateSb.push('text', '', 0);
        newToken.content = '⚠️NOTE️️️⚠️';
        newToken = stateSb.push('notepreamb_open', 'strong', -1);        
        newTokens.forEach(t => stateSb.tokens.push(t));
        newToken = stateSb.push('note_close', 'div', -1);
    }

    // public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
    //     const token = tokens[tokenIdx];
    //     // return '<div class="note">' + markdownIt.utils.escapeHtml(token.content) + '</div>';
    //     return '<div style="margin: 2em; background-color: #e0e0e0"><strong>NOTE:</strong> ' + markdownIt.utils.escapeHtml(token.content) + '</div>';
    // }
}