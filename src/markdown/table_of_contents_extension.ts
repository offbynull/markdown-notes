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

class TocData {
    public readonly headingAnchors: Map<Token, string> = new Map<Token, string>();
    public nextId: number = 0;
}

export class TocExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('toc', Type.BLOCK),
        new TokenIdentifier('__toc_anchor', Type.INLINE)
    ];

    public postProcess(markdownIt: MarkdownIt, tokens: Token[], context: Map<string, any>): void {
        const tocData: TocData = context.get('toc') || new TocData();
        context.set('toc', tocData);

        for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
            const token = tokens[tokenIdx];

            if (token.type === 'heading_open') {
                // Generate anchor ID
                const anchorId = 'HEADREF' + tocData.nextId;
                tocData.nextId++;
                tocData.headingAnchors.set(token, anchorId);

                // Put in custom token just before the heading -- will get translated to anchor when rendered
                //   (Alternatively, you can add in a link_open and link_close tag instead of a custom token)
                const tocAnchorToken = new Token('__toc_anchor', '', 0);
                tocAnchorToken.info = anchorId;
                tokens.splice(tokenIdx, 0, tocAnchorToken);
                tokenIdx += 1;
                
                if (token.children !== null) { // typedef is wrong -- children MAY be null
                    this.postProcess(markdownIt, token.children, context); // not really required but just incase
                }
            }
        }
    }

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const type = tokens[tokenIdx].type;
        switch (type) {
            case 'toc':
                return this.renderToc(markdownIt, tokens, tokenIdx, context);
            case '__toc_anchor':
                return this.renderTocAnchor(markdownIt, tokens, tokenIdx, context);
            default:
                throw 'Render called for unrecognized type: ' + type;
        }
    }

    private renderTocAnchor(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const tocAnchorToken = tokens[tokenIdx];
        const tocAnchorId = tocAnchorToken.info;
        return '<a name="' + markdownIt.utils.escapeHtml(tocAnchorId) + '"></a>';
    }

    private renderToc(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const tocData: TocData = context.get('toc') || new TocData();
        context.set('toc', tocData);

        let ret = '';
        let inHeader = false;
        let headerLevel = 0;
        let headerPath: Token[] = []; // hierarchy of heading_open nodes -- changes as traversal happens
        for (const token of tokens) {
            if (token.type === 'heading_open') {
                inHeader = true;
                headerPath.push(token);

                const newHeaderLevel = token.markup.length; // the number of # chars defines the header level
                if (newHeaderLevel > headerLevel) {
                    while (headerLevel < newHeaderLevel) {
                        ret += '<ul>\n';
                        headerLevel++;
                    }
                } else if (newHeaderLevel < headerLevel) {
                    while (headerLevel > newHeaderLevel) {
                        ret += '</ul>\n';
                        headerLevel--;
                    }
                }
                continue;
            }
    
            if (token.type === 'heading_close') {
                inHeader = false;
                headerPath.pop();
                
                continue;
            }
    
            if (inHeader === true) {
                const headerOpenToken = headerPath[headerPath.length - 1];
                const anchorId = tocData.headingAnchors.get(headerOpenToken);
                if (anchorId === undefined) {
                    throw 'Unable to find anchor for token';
                }
                ret += '<li>'
                    + '<a href="#' + markdownIt.utils.escapeHtml(anchorId) + '">'
                    + markdownIt.utils.escapeHtml(token.content)
                    + '</a>'
                    + '</li>\n';
            }
        }
    
        while (headerLevel > 0) {
            ret += '</ul>\n';
            headerLevel--;
        }
    
        return '<div class="toc">\n' + ret + '</div>\n';
    }
}