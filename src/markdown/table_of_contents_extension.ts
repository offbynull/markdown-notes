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

class TocData {
    public readonly headingAnchors: Map<Token, string> = new Map<Token, string>();
    public readonly anchors: Set<string> = new Set<string>();
}

export class TocExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('toc', Type.BLOCK),
        new TokenIdentifier('__toc_anchor', Type.INLINE)
    ];

    public postProcess(markdownIt: MarkdownIt, tokens: Token[], context: ExtensionContext): void {
        const tocData: TocData = context.shared.get('toc') || new TocData();
        context.shared.set('toc', tocData);

        for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
            const token = tokens[tokenIdx];

            if (token.type === 'heading_open') {
                // Generate anchor ID
                let anchorId;
                let counter = 0;
                while (true) {
                    anchorId = 'H' + (counter > 0 ? counter : '') + '_' + tokens[tokenIdx+1].content; // +1 because the text is in the next token
                    if (tocData.anchors.has(anchorId)) {
                        counter++;
                        continue;
                    }
                    tocData.anchors.add(anchorId);
                    tocData.headingAnchors.set(token, anchorId);
                    break;
                }

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

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
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

    private renderTocAnchor(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const tocAnchorToken = tokens[tokenIdx];
        const tocAnchorId = tocAnchorToken.info;
        return '<a name="' + encodeURIComponent(tocAnchorId) + '"></a>';
    }

    private renderToc(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const tocData: TocData = context.shared.get('toc') || new TocData();
        context.shared.set('toc', tocData);

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
                    + '<a href="#' + encodeURIComponent(anchorId) + '">'
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