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
import Token from 'markdown-it/lib/token.mjs';
import { Extension, TokenIdentifier, Type, ExtensionContext } from './extender_plugin';
import { breakOnSlashes, combineWithSlashes } from '../utils/parse_helpers';
import { BookmarkRegexScannerCollection, BookmarkKey } from './bookmark_regex_scanner_collection';

class BookmarkData {
    public readonly scanner = new BookmarkRegexScannerCollection(); // bookmark regex to entry
    public readonly anchorIdToLabel = new Map<string, string>(); // anchor id to label
    public linkerActive: boolean = true;
}

export class BookmarkLinkerControllerExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm-disable-all', Type.INLINE),
        new TokenIdentifier('bm-enable-all', Type.INLINE),
        new TokenIdentifier('bm-redirect', Type.INLINE),
        new TokenIdentifier('bm-reset', Type.INLINE),
        new TokenIdentifier('bm-disable', Type.INLINE),
        new TokenIdentifier('bm-enable', Type.INLINE)
    ];
}

export class BookmarkReferenceTargetExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm-target', Type.INLINE)
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

        let anchorId;

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
                anchorId = 'BM_' + combineWithSlashes([info.regex, info.flags]);
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
                anchorId = 'BME_' + combineWithSlashes([info.regex, info.flags]);
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
                anchorId = 'BMI_' + combineWithSlashes([info.regex, info.flags]);
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
                if (broken.length !== 1) {
                    throw 'Incorrect number of arguments in bm-enable tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-enable} text for bookmark`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const key = bookmarkData.scanner.findKeyByMatch(broken[0]);
                if (key === null) {
                    throw `Text in bm-enable tag doesn't match any bookmark: ${JSON.stringify(broken)}`;
                }
                bookmarkData.scanner.enableBookmark(key, true);
            } else if (token.type === 'bm-disable') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 1) {
                    throw 'Incorrect number of arguments in bm-disable tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-disable} text for bookmark`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const key = bookmarkData.scanner.findKeyByMatch(broken[0]);
                if (key === null) {
                    throw `Text in bm-disable tag doesn't match any bookmark: ${JSON.stringify(broken)}`;
                }
                bookmarkData.scanner.enableBookmark(key, false);
            } else if (token.type === 'bm-redirect') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 2) {
                    throw 'Incorrect number of arguments in bm-redirect tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-redirect} text for from bookmark/text for to bookmark`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const fromKey = bookmarkData.scanner.findKeyByMatch(broken[0]);
                const toKey = bookmarkData.scanner.findKeyByMatch(broken[1]);
                if (fromKey === null) {
                    throw `From text in bm-redirect tag doesn't match any bookmark: ${JSON.stringify(broken)}`;
                }
                if (toKey === null) {
                    throw `To text in bm-redirect tag doesn't match any bookmark: ${JSON.stringify(broken)}`;
                }
                bookmarkData.scanner.redirectBookmark(fromKey, toKey);
                continue;
            } else if (token.type === 'bm-reset') {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 1) {
                    throw 'Incorrect number of arguments in bm-reset tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-reset} text for bookmark`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const key = bookmarkData.scanner.findKeyByMatch(broken[0]);
                if (key === null) {
                    throw `Text in bm-reset tag doesn't match any bookmark: ${JSON.stringify(broken)}`;
                }
                bookmarkData.scanner.redirectBookmark(key, null);
                continue;
            }

            // Process
            if (token.type !== 'text' && token.type !== 'bm-target') {
                if (token.children !== null) {
                    this.postProcess(markdownIt, token.children, context)
                }
                continue;
            }


            // At this point, you're outputting and linking text -- if bookmarker is off, skip it
            if (bookmarkData.linkerActive === false) {
                continue;
            }

            let replacementTokens: Token[] = [];
            if (token.type === 'bm-target') {
                // Output a piece of text but link it to a bookmark for some other piece of text that isn't displayed
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 2) {
                    throw 'Incorrect number of arguments in bm-target tag: ' + JSON.stringify(broken) + '\n'
                        + '------\n'
                        + 'Examples:\n'
                        + '  `{bm-target} display text/text for bookmark`\n'
                        + 'Tag arguments are delimited using forward slash (\). Use \\ to escape the delimiter (\\/).';
                }
                const text = broken[0];
                const targetText = broken[1];
                const scanRes = bookmarkData.scanner.scan(targetText);
                const anchorId = scanRes?.anchorId;

                if (anchorId === null || anchorId === undefined) {
                    throw 'No anchor ID for bookmark (is the bookmark from a bm-ignore tag?)\n'
                        + '\n'
                        + 'Display text: ' + text + '\n'
                        + 'Target text: ' + targetText + '\n';
                }

                replacementTokens.push(new Token('bookmark_link_open', 'a', 1));
                replacementTokens[replacementTokens.length - 1].attrSet('href', '#' + markdownIt.utils.escapeHtml(anchorId));
                replacementTokens.push(new Token('text', '', 0));
                replacementTokens[replacementTokens.length - 1].content = text;
                replacementTokens.push(new Token('bookmark_link_close', 'a', -1));
            } else if (token.type == 'text') {
                // Scan the token and recursively break it up based on the bookmarks identified
                let content = token.content;
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
                            bookmarkTokens[bookmarkTokens.length - 1].attrSet('href', '#' + encodeURIComponent(scanResult.anchorId));
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
        return `<a name="${encodeURIComponent(anchorId)}"></a><strong>${markdownIt.utils.escapeHtml(label)}</strong>`;
    }
}