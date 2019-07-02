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
import { Extension, TokenIdentifier, Type, ExtensionContext } from './extender_plugin';

class BookmarkData {
    public readonly bookmarks: Map<string, string> = new Map<string, string>();
    public nextId: number = 0;
}

export class BookmarkReferenceIgnoreExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bookmark-ref-ignore', Type.INLINE),
        new TokenIdentifier('bm-ri', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number): void {
        const token = tokens[tokenIdx];
        token.type = 'text_no_bookmark_reference';
        token.tag = '';
    }
}

export class BookmarkExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bookmark', Type.INLINE),
        new TokenIdentifier('bm', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): void {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        const token = tokens[tokenIdx];
        let content = token.content;
        let showText = true;
        if (content.startsWith('|no_out')) {
            content = content.substring('|no_out'.length).trim();
            showText = false;
        } else if (content.startsWith('|out')) {
            content = content.substring('|out'.length).trim();
            showText = true;
        }

        const origText = token.content;
        const bookmarkId = content.toLowerCase(); // Convert to lower-case for case insensitive matching
        token.content = bookmarkId;
        

        if (bookmarkData.bookmarks.has(bookmarkId)) {
            throw 'Bookmark already defined: ' + bookmarkId;
        }

        bookmarkData.bookmarks.set(bookmarkId, 'bookmark' + bookmarkData.nextId);
        bookmarkData.nextId++;

        if (showText === true) {
            const replacementTextTokens = [
                new Token('html_inline', '', 0),
                new Token('text_no_bookmark_reference', '', 0),
                new Token('html_inline', '', 0)
            ];
            replacementTextTokens[0].content = '<strong>';
            replacementTextTokens[1].content = origText;
            replacementTextTokens[2].content = '</strong>';
            tokens.splice(tokenIdx + 1, 0, ... replacementTextTokens);
        }
    }

    public postProcess(markdownIt: MarkdownIt, tokens: Token[], context: ExtensionContext): void {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        let headerSkipMode = false;
        for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
            const token = tokens[tokenIdx];

            // Don't process when in a heading
            if (token.type === 'heading_open') {
                headerSkipMode = true;
                continue;
            } else if (token.type === 'heading_close') {
                headerSkipMode = false;
                continue;
            }

            if (headerSkipMode) {
                continue;
            }


            // Don't process if text was specifically labelled to be not bookmarkable
            if (token.type === 'text_no_bookmark_reference') {
                token.type = 'text';
                continue;
            }


            // Process
            if (token.type !== 'text') {
                if (token.children !== null) {
                    this.postProcess(markdownIt, token.children, context)
                }
                continue;
            }

            // Sort bookmarks by bookmark text size. We want the bookmarks with the longest texts first to avoid conflicts once
            // we start searching. For example if we had the following bookmark texts...
            //     ['This', 'This is a Train', 'Train']
            // ... and we wanted to search the following string for them ...
            //     'Hello! This is a Train!!'
            // We would always first find the substring 'This is a Train' instead of just 'This' or 'Train'.
            const bookmarks = bookmarkData.bookmarks;
            const sortedBookmarks = Array.from(bookmarks);
            sortedBookmarks.sort((a, b) => b[0].length - a[0].length)

            // Scan the token and recursively break it up based on the bookmarks identified
            const newTokens: Token[] = [ token ];
            for (let newTokenIdx = 0; newTokenIdx < newTokens.length; newTokenIdx++) {
                const newToken = newTokens[newTokenIdx];

                // We only care about text tokens -- if it isn't text, skip it.
                if (newToken.type !== 'text') {
                    continue;
                }

                // Go through each bookmark -- if the text token contains the bookmark text then break it up such that
                // the bookmark text is a link to the bookmark id. Note that the generated tokens will contain text tokens
                // themselves, specifically a text token that contains the matched bookmark text. For example...
                //     'This is my bookmark!!!'
                // ...would get tokenized as...
                //     text: 'this is my '
                //     link_open: href=#bookmarkId
                //     text: 'bookmark'
                //     link_close:
                //     text: '!!!'
                // The problem with this is that if we're going to re-scan over these generated tokens later on (because
                // even though we've generated tokens and replaced the original token based on the matched bookmark text,
                // there still may be references to other bookmark texts in our newly generated tokens). We don't want to
                // match again on the original substring we broke out (infinite loop), so that specific token has its type
                // set to a temporary value of 'BOOKMARK_TEXT_REPLACEME'...
                //     text: 'this is my '
                //     link_open: href=#bookmarkId
                //     BOOKMARK_TEXT_REPLACEME: 'bookmark' <-- NOT SET TO text TYPE BECAUSE WE DON'T WANT ANYMORE MATCHES
                //     link_close:
                //     text: '!!!'
                // The type will be reverted back to a normal 'text' type once the entire process completes.
                let replacementTokens: Token[] = [];
                for (const [bookmarkText, bookmarkId] of sortedBookmarks) {
                    replacementTokens = this.tokenizeToBookmarkLink(markdownIt, bookmarkText, bookmarkId, newToken.content, 'BOOKMARK_TEXT_REPLACEME');
                    if (replacementTokens.length !== 0) {
                        break; // bookmark was found, stop searching
                    }
                }

                if (replacementTokens.length !== 0) { // if there were replacement tokens produced, then replace the token
                    // Replace the token and then move the index back so we can re-scan the from the newly generated
                    // tokens. More bookmarks may match on the the same text.
                    newTokens.splice(newTokenIdx, 1, ...replacementTokens); 
                    newTokenIdx--;
                }
            }

            // Now that the scan's complete, we can correct the types (there is no chance of an infinite loop at this point)
            for (const newToken of newTokens) {
                if (newToken.type === 'BOOKMARK_TEXT_REPLACEME') {
                    newToken.type = 'text';
                }
            }

            // Replace in full tokens
            tokens.splice(tokenIdx, 1, ...newTokens); // Replace old token with new tokens 
            tokenIdx += newTokens.length - 1;         // Adjust the index to account for the change
        }
    }

    private tokenizeToBookmarkLink(markdownIt: MarkdownIt, bookmarkText: string, bookmarkId: string, content: string, tempType: string): Token[] {
        // We need to lowercase for searching because all bookmark IDs are lowercase. We do this to
        // support case insensitive bookmarks -- e.g. TEXT and tExT and text should all link to the
        // same bookmark.
        const contentLc = content.toLowerCase();
        
        let oldIdx = 0;
        let nextIdx = contentLc.indexOf(bookmarkText, oldIdx);
        if (nextIdx === -1) {
            return [];
        }

        let replacementTokens: Token[] = [];
        do {
            const linkText = content.slice(nextIdx, nextIdx + bookmarkText.length);

            // The bookmark_link types below don't have a render function because they don't need one.
            // The tag and attr values get moved directly to HTML and apparently markdown-it recognizes
            // the _open/_close suffix (_close will make the tag output as a closing HTML tag).
            //
            // Notice the token type for the broken out text is BOOKMARK_TEXT_REPLACEME. We need to
            // assign a temporary type to the broken out text because that generated token will
            // likely get re-scanned
            const bookmarkTokens = [
                new Token('text', '', 0), // pre text
                new Token('bookmark_link_open', 'a', 1),
                new Token(tempType, '', 0), // link text
                new Token('bookmark_link_close', 'a', -1)
            ];
            bookmarkTokens[0].content = content.substring(oldIdx, nextIdx);
            bookmarkTokens[1].attrSet('href', '#' + markdownIt.utils.escapeHtml(bookmarkId));
            bookmarkTokens[2].content = linkText;
            replacementTokens = replacementTokens.concat(bookmarkTokens);

            oldIdx = nextIdx + bookmarkText.length;
            nextIdx = contentLc.indexOf(bookmarkText, oldIdx);
        } while (nextIdx !== -1);

        const remainderText = content.substring(oldIdx);
        if (remainderText.length !== 0) {
            const remainderTextToken = new Token('text', '', 0)
            remainderTextToken.content = remainderText;
            replacementTokens.push(remainderTextToken);
        }

        return replacementTokens;
    }
    
    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        const token = tokens[tokenIdx];
        const content = token.content;
        
        const bookmarkId = bookmarkData.bookmarks.get(content);
        if (bookmarkId === undefined) {
            throw 'Undefined bookmark when rendering: ' + content; // this should never happen
        }
        return '<a name="' + markdownIt.utils.escapeHtml(bookmarkId) + '"></a>';
    }
}