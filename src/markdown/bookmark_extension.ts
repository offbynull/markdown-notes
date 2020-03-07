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
import { breakOnSlashes } from '../utils/parse_helpers';
import { BookmarkRegexScannerCollection, BookmarkKey } from './bookmark_regex_scanner_collection';

class BookmarkData {
    public readonly scanner = new BookmarkRegexScannerCollection(); // bookmark regex to entry
    public readonly anchorIdToLabel = new Map<string, string>(); // anchor id to label
    public nextId = 0;
    public linkerActive: boolean = true;
}

export class BookmarkLinkerControllerExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm-disable-all', Type.INLINE),
        new TokenIdentifier('bm-enable-all', Type.INLINE),
        new TokenIdentifier('bm-redirect', Type.INLINE),
        new TokenIdentifier('bm-reset', Type.INLINE),
        new TokenIdentifier('bm-disable', Type.INLINE),
        new TokenIdentifier('bm-enable', Type.INLINE),
    ];
}

export class BookmarkReferenceIgnoreExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm-skip', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, token: Token): void {
        token.type = 'text_no_bookmark_reference';
        token.tag = '';
    }
}

export class BookmarkExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm', Type.INLINE),
        new TokenIdentifier('bm-error', Type.INLINE),
        new TokenIdentifier('bm-ignore', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext): void {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        const anchorId = "BOOKMARK" + bookmarkData.nextId;
        bookmarkData.nextId++;

        switch (token.type) {
            case 'bm': {
                const info = (() => {
                    const broken = breakOnSlashes(token.content);
                    switch(broken.length) {
                        case 1:
                            return {
                                label: broken[0],
                                regex: '(' + broken[0] + ')',
                                flags: 'i',
                                showPreamble: false,
                                showPostamble: false
                            };
                        case 3:
                            return {
                                label: broken[0],
                                regex: broken[1],
                                flags: broken[2],
                                showPreamble: false,
                                showPostamble: false
                            };
                        case 5:
                            return {
                                label: broken[0],
                                regex: broken[1],
                                flags: broken[2],
                                showPreamble: BookmarkExtension.toBoolean(broken[3]),
                                showPostamble: BookmarkExtension.toBoolean(broken[4])
                            }
                        default:
                            throw 'Incorrect number of arguments in bm tag: ' + JSON.stringify(broken) + '\n'
                                + '------\n'
                                + 'Examples:\n'
                                + '  `{bm} my bookmark`\n'
                                + '  `{bm} my label/(bookmark\\s+regex)/i`\n'
                                + '  `{bm} my label/(bookmark\\s+regex)/i/true/true`\n'
                                + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                    }
                })();
                bookmarkData.scanner.addNormalBookmark(
                    new BookmarkKey(info.regex, info.flags),
                    anchorId,
                    info.showPreamble,
                    info.showPostamble);
                bookmarkData.anchorIdToLabel.set(anchorId, info.label);
                break;
            }
            case 'bm-error': {
                const info = (() => {
                    const broken = breakOnSlashes(token.content);
                    switch(broken.length) {
                        case 1:
                            return {
                                errorText: broken[0] + ' caused a bookmark error but no error message was supplied',
                                regex: '(' + broken[0] + ')',
                                flags: 'i',
                                showPreamble: false,
                                showPostamble: false
                            };
                        case 3:
                            return {
                                errorText: broken[0],
                                regex: broken[1],
                                flags: broken[2],
                                showPreamble: false,
                                showPostamble: false
                            };
                        case 5:
                            return {
                                errorText: broken[0],
                                label: broken[1],
                                regex: broken[2],
                                flags: broken[3],
                                showPreamble: BookmarkExtension.toBoolean(broken[4]),
                                showPostamble: BookmarkExtension.toBoolean(broken[5])
                            }
                        default:
                            throw 'Incorrect number of arguments in bm-error tag: ' + JSON.stringify(broken) + '\n'
                                + '------\n'
                                + 'Examples:\n'
                                + '  `{bm-error} bookmark regex`\n'
                                + '  `{bm-error} my error message/(bookmark\\s+regex)/i`\n'
                                + '  `{bm-error} my error message/(bookmark\\s+regex)/i/true/true`\n'
                                + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                    }
                })();
                // what's the point of having showPreamble/showPostamble for errors? it allows you to redirect the error to a normal bookmark
                bookmarkData.scanner.addErrorBookmark(
                    new BookmarkKey(info.regex, info.flags),
                    info.showPreamble,
                    info.showPostamble,
                    info.errorText);
                break;
            }
            case 'bm-ignore': {
                const info = (() => {
                    const broken = breakOnSlashes(token.content);
                    switch(broken.length) {
                        case 1:
                            return {
                                regex: '(' + broken[0] + ')',
                                flags: 'i',
                                showPreamble: false,
                                showPostamble: false
                            };
                        case 2:
                            return {
                                regex: broken[0],
                                flags: broken[1],
                                showPreamble: false,
                                showPostamble: false
                            };
                        case 4:
                            return {
                                regex: broken[0],
                                flags: broken[1],
                                showPreamble: BookmarkExtension.toBoolean(broken[2]),
                                showPostamble: BookmarkExtension.toBoolean(broken[3])
                            };
                        default:
                            throw 'Incorrect number of arguments in bm-ignore tag: ' + JSON.stringify(broken) + '\n'
                                + '------\n'
                                + 'Examples:\n'
                                + '  `{bm-ignore} text to ignore`\n'
                                + '  `{bm-ignore} (ignore\\s+regex)/i`\n'
                                + '  `{bm-ignore} (ignore\\s+regex)/i/true/true`\n'
                                + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                    }
                })();
                bookmarkData.scanner.addNormalBookmark(
                    new BookmarkKey(info.regex, info.flags),
                    null,
                    info.showPreamble,
                    info.showPostamble);
                break;
            }
            default:
                throw 'This should never happen';
        }

        token.content = anchorId;
    }

    private static toBoolean(s: string) {
        switch (s) {
            case 'true': return true;
            case 'false': return false;
            default: throw s + ' cannot be converted to boolean';
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

            // Don't process image tags
            if (token.type === 'image') {
                continue;
            }


            // Control linking
            if (token.type === 'bm-disable-all') {
                bookmarkData.linkerActive = false;
                continue;
            } else if (token.type === 'bm-enable-all') {
                bookmarkData.linkerActive = true;
                continue;
            } else if (token.type === 'bm-enable') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 2) {
                    throw 'Incorrect number of arguments in bm-link-enable tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-link-enable} (existing\\s+regex1)/i`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const key = new BookmarkKey(broken[0], broken[1]);
                bookmarkData.scanner.enableBookmark(key, true);
            } else if (token.type === 'bm-disable') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 2) {
                    throw 'Incorrect number of arguments in bm-link-disable tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-link-disable} (existing\\s+regex1)/i`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const key = new BookmarkKey(broken[0], broken[1]);
                bookmarkData.scanner.enableBookmark(key, false);
            } else if (token.type === 'bm-redirect') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 4) {
                    throw 'Incorrect number of arguments in bm-link-redirect tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-link-redirect} (existing\\s+regex1)/i/(existing\\s+regex2)/i`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const fromKey = new BookmarkKey(broken[0], broken[1]);
                const toKey = new BookmarkKey(broken[2], broken[3]);
                bookmarkData.scanner.redirectBookmark(fromKey, toKey);
                continue;
            } else if (token.type === 'bm-reset') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 2) {
                    throw 'Incorrect number of arguments in bm-link-reset tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-link-reset} (existing\\s+regex1)/i`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const key = new BookmarkKey(broken[0], broken[1]);
                bookmarkData.scanner.redirectBookmark(key, null);
                continue;
            }

            // Process
            if (token.type !== 'text') {
                if (token.children !== null) {
                    this.postProcess(markdownIt, token.children, context)
                }
                continue;
            }


            // At this point, this is an entire block of text -- if bookmarker is off, skip it
            if (bookmarkData.linkerActive === false) {
                continue;
            }

            // Scan the token and recursively break it up based on the bookmarks identified
            let content = token.content;
            let replacementTokens: Token[] = [];                
            while (true) {
                const scanResult = bookmarkData.scanner.scan(content);
                if (scanResult === null) {
                    const lastToken = (() => {
                        if (replacementTokens.length === 0) { // if nothing was modified, so just keep the original token (we want to be as pure as possible)
                            return token
                        } else { // if something was modified, add the remaining content as a new token
                            const finalToken = new Token('text', '', 0);
                            finalToken.content = content;
                            return finalToken;
                        }
                    })();
                    replacementTokens.push(lastToken);
                    break;
                }

                const startMatchIdx = scanResult.fullIndex;
                const endMatchIdx = scanResult.fullIndex + scanResult.fullMatch.length;

                const preText = content.substring(0, startMatchIdx);
                const capturePreambleText = scanResult.capturePreamble;
                const captureText = scanResult.captureMatch;
                const capturePostambleText = scanResult.capturePostamble;
                const postText = content.substring(endMatchIdx);

                const bookmarkTokens = (() => {
                    if (scanResult.anchorId === null) {    // if null this was an ignore marker, just put the text back in and move on.
                        const bookmarkTokens: Token[] = [];
                        // pre text
                        bookmarkTokens.push(new Token('text', '', 0));
                        bookmarkTokens[bookmarkTokens.length - 1].content = preText;
                        // capture preamble text
                        if (capturePreambleText !== null) {
                            bookmarkTokens.push(new Token('text', '', 0)); 
                            bookmarkTokens[bookmarkTokens.length - 1].content = capturePreambleText;
                        }
                        // capture link text
                        bookmarkTokens.push(new Token('text', '', 0));
                        bookmarkTokens[bookmarkTokens.length - 1].content = captureText;
                        // capture postamble text
                        if (capturePostambleText !== null) {
                            bookmarkTokens.push(new Token('text', '', 0));
                            bookmarkTokens[bookmarkTokens.length - 1].content = capturePostambleText;
                        }
                        return bookmarkTokens;
                    } else {                               // if not null this was an normal marker, add the bookmark link
                        const bookmarkTokens: Token[] = [];
                        // pre text
                        bookmarkTokens.push(new Token('text', '', 0));
                        bookmarkTokens[bookmarkTokens.length - 1].content = preText;
                        // capture preamble text
                        if (capturePreambleText !== null) {
                            bookmarkTokens.push(new Token('text', '', 0)); 
                            bookmarkTokens[bookmarkTokens.length - 1].content = capturePreambleText;
                        }
                        // capture link start
                        bookmarkTokens.push(new Token('bookmark_link_open', 'a', 1));
                        bookmarkTokens[bookmarkTokens.length - 1].attrSet('href', '#' + markdownIt.utils.escapeHtml(scanResult.anchorId));
                        // capture link text
                        bookmarkTokens.push(new Token('text', '', 0));
                        bookmarkTokens[bookmarkTokens.length - 1].content = captureText;
                        // capture link end
                        bookmarkTokens.push(new Token('bookmark_link_close', 'a', -1));
                        // capture postamble text
                        if (capturePostambleText !== null) {
                            bookmarkTokens.push(new Token('text', '', 0));
                            bookmarkTokens[bookmarkTokens.length - 1].content = capturePostambleText;
                        }
                        return bookmarkTokens;
                    }
                })();

                replacementTokens = replacementTokens.concat(bookmarkTokens);
                content = postText;
            }

            // Replace in full tokens
            tokens.splice(tokenIdx, 1, ...replacementTokens); // Replace old token with new tokens 
            tokenIdx += replacementTokens.length - 1;         // Adjust the index to account for the change
        }
    }
    
    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        const token = tokens[tokenIdx];

        const anchorId = token.content;

        const label = bookmarkData.anchorIdToLabel.get(anchorId);
        if (label === undefined) {
            return '';
        }
        return `<a name="${markdownIt.utils.escapeHtml(anchorId)}"></a><strong>${markdownIt.utils.escapeHtml(label)}</strong>`;
    }
}