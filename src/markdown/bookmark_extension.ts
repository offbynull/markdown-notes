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
import { groupify, parseRegexLiteral } from '../utils/regex';
import { breakOnSlashes } from '../utils/parse_helpers';

class BookmarkData {
    public readonly scanner = new BookmarkScannerList(); // bookmark regex to entry
    public readonly anchorIdToLabel = new Map<string, string>(); // anchor id to label
    public nextId = 0;
}

export class BookmarkReferenceIgnoreExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm-ri', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, token: Token): void {
        token.type = 'text_no_bookmark_reference';
        token.tag = '';
    }
}

export class BookmarkExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('bm', Type.INLINE),
        new TokenIdentifier('bm-ambiguous', Type.INLINE),
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
                bookmarkData.scanner.addNormalBookmark(info.regex, info.flags, anchorId, info.showPreamble, info.showPostamble);
                bookmarkData.anchorIdToLabel.set(anchorId, info.label);
                break;
            }
            case 'bm-ambiguous': {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 3) {
                    throw 'Error bookmark tags require exactly 3 parameters separated by slashes: error_text/regex/regex_flags';
                }
                const errorText = broken[0];
                const regex = broken[1];
                const flags = broken[2];
                bookmarkData.scanner.addErrorBookmark(regex, flags, errorText);
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
                bookmarkData.scanner.addNormalBookmark(info.regex, info.flags, null, info.showPreamble, info.showPostamble);
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

            // Process
            if (token.type !== 'text') {
                if (token.children !== null) {
                    this.postProcess(markdownIt, token.children, context)
                }
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

                const startMatchIdx = scanResult.capture.fullIndex;
                const endMatchIdx = scanResult.capture.fullIndex + scanResult.capture.fullMatch.length;

                const preText = content.substring(0, startMatchIdx);
                const capturePreambleText = scanResult.entry.showPreamble ? scanResult.capture.capturePreamble : null;
                const captureText = scanResult.capture.captureMatch;
                const capturePostambleText = scanResult.entry.showPostamble ? scanResult.capture.capturePostamble : null;
                const postText = content.substring(endMatchIdx);

                const bookmarkTokens = (() => {
                    if (scanResult.entry.anchorId === null) {    // if null this was an ignore marker, just put the text back in and move on.
                        const bookmarkTokens: Token[] = [];
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
                        bookmarkTokens[bookmarkTokens.length - 1].attrSet('href', '#' + markdownIt.utils.escapeHtml(scanResult.entry.anchorId));
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





















//
// Bookmark scanning logic -- visible for testing.
//


export interface BookmarkRegexCapture {
    fullIndex: number,
    fullMatch: string,
    captureIndex: number,
    captureMatch: string,
    capturePreamble: string,
    capturePostamble: string,
};

export class BookmarkRegexScanner {
    private readonly originalRegex: string;
    private readonly regexp: RegExp;
    private readonly groupMappings: ReadonlyArray<number>;
    
    static create(regex: string, flags: string) {
        const groupifiedRegex = groupify(regex);
        
        const group1Exists = groupifiedRegex.groupMappings.filter(m => m === 1).length === 1;
        const extraGroupsExist = groupifiedRegex.groupMappings.filter(m => m !== -1 && m !== 0 && m !== 1).length > 0;
        if (group1Exists === false || extraGroupsExist === true) {
            throw 'Bookmark regex must contain exactly 1 explicit capture group (not more or less): ' + regex;
        }

        return new BookmarkRegexScanner(
            regex,
            new RegExp(groupifiedRegex.regex, flags),
            groupifiedRegex.groupMappings
        );
    }

    static createFromLiteral(regexLiteral: string) {
        const parsedRegexLiteral = parseRegexLiteral(regexLiteral);
    
        return BookmarkRegexScanner.create(parsedRegexLiteral.regex, parsedRegexLiteral.flags);
    }

    private constructor(originalRegex: string, regexp: RegExp, groupMappings: number[]) {
        this.originalRegex = originalRegex;
        this.regexp = regexp;
        this.groupMappings = groupMappings;
    }

    public scan(text: string): BookmarkRegexCapture | null {
        this.regexp.lastIndex = 0;
        const execRes = this.regexp.exec(text);
        if (execRes === null) {
            return null;
        }

        let nextStartIdx = 0;
        for (let i = 1; i < this.groupMappings.length; i++) {
            const groupMapping = this.groupMappings[i];
            const groupText = execRes[i];
            if (groupMapping === 1) {
                if (groupText.length === 0) {
                    throw 'Bookmark regex must capture at least 1 character (it captured nothing): ' + this.originalRegex;
                }
                
                return {
                    fullIndex: execRes.index,
                    fullMatch: execRes[0],
                    captureIndex: execRes.index + nextStartIdx,
                    captureMatch: groupText,
                    capturePreamble: execRes[0].substring(0, nextStartIdx),
                    capturePostamble: execRes[0].substring(nextStartIdx + groupText.length)
                };
            }

            nextStartIdx += groupText.length;
        }

        throw 'This should never happen'; // we have have at least capture group 1
    }
}
























abstract class BookmarkEntry {
    public readonly origRegex: string; // original regex
    protected constructor(origRegex: string) {
        this.origRegex = origRegex;
    }
}

export class NormalBookmarkEntry extends BookmarkEntry {
    public readonly anchorId: string | null;
    public readonly showPreamble: boolean;
    public readonly showPostamble: boolean;
    public constructor(origRegex: string, anchorId: string | null, showPreamble: boolean, showPostamble: boolean) {
        super(origRegex);
        this.anchorId = anchorId;
        this.showPreamble = showPreamble;
        this.showPostamble = showPostamble;
    }
}

export class ErrorBookmarkEntry extends BookmarkEntry {
    public readonly errorText: string;
    public constructor(origRegex: string, errorMessage: string) {
        super(origRegex);
        this.errorText = errorMessage;
    }
}

interface ScannerEntry {
    scanner: BookmarkRegexScanner;
    entry: BookmarkEntry;
}

interface CaptureEntry {
    capture: BookmarkRegexCapture;
    entry: BookmarkEntry;
}

export class BookmarkScannerList {
    private readonly entries: ScannerEntry[] = [];

    public addNormalBookmark(regex: string, flags: string, anchorId: string | null, showPreamble: boolean, showPostamble: boolean) {
        const entry = new NormalBookmarkEntry(regex, anchorId, showPreamble, showPostamble);

        const scanner = BookmarkRegexScanner.create(regex, flags);
        this.entries.push({ scanner: scanner, entry: entry });
    }

    public addErrorBookmark(regex: string, flags: string, errorMessage: string) {
        const entry = new ErrorBookmarkEntry(regex, errorMessage);

        const scanner = BookmarkRegexScanner.create(regex, flags);
        this.entries.push({ scanner: scanner, entry: entry });
    }

    public scan(text: string) {
        const matches: CaptureEntry[] = [];
        for (const entry of this.entries) {
            const match = entry.scanner.scan(text);
            if (match !== null) {
                matches.push({
                    capture: match,
                    entry: entry.entry
                });
            }
        }

        if (matches.length === 0) {
            return null;
        }


        let filterMatches = matches;
        
        // Sort by earliest matches on the capture group
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.captureIndex < b.capture.captureIndex ? -1 : 1);
        const earliestMatchIdx = filterMatches[0].capture.captureIndex;
        filterMatches = filterMatches.filter(m => m.capture.captureIndex === earliestMatchIdx);

        // Sort by longest matches on the capture group
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.captureMatch > b.capture.captureMatch ? -1 : 1);
        const longestMatchIdx = filterMatches[0].capture.captureMatch.length;
        filterMatches = filterMatches.filter(m => m.capture.captureMatch.length === longestMatchIdx);

        // If any of the remaining matches were error matches, only return the error match if nothing else was matched. For example, imagine the following markup...
        //    `{bm} base/(base)_nucleotide/i`
        //    `{bm} base/(base)_pH/i`
        //    `{bm-ambiguous} Disambiguate using either base_pH or base_nucleotide/(base)/i`
        // ...the term base_pH will match both the 2nd bookmark and the error, but base_pH is clearly correct. No error should be thrown.
        const normalMatches = filterMatches.filter(m => m.entry instanceof NormalBookmarkEntry);
        const errorMatches = filterMatches.filter(m => m.entry instanceof ErrorBookmarkEntry);
        if (normalMatches.length === 0 && errorMatches.length >= 1) { // nothing matched except for errors -- show the errors
            const errorObjs = {
                matchedAmbiguities: errorMatches.map(em => ({ regex: em.entry.origRegex, errorMessage: (em.entry as ErrorBookmarkEntry).errorText, block: text }))
            };
            throw 'Bookmark disambiguation errors matched:\n' + JSON.stringify(errorObjs, null, 2);
        } else if (normalMatches.length === 1) { // exactly 1 thing matched -- ignore any errors that may have matched as well (for reasoning discussed in block comment above)
            const normalEntry = normalMatches[0].entry as NormalBookmarkEntry;
            const normalCapture = normalMatches[0].capture;
            return {
                capture: normalCapture,
                entry: normalEntry
            }
        } else {
            const errorObjs = {
                matchedBookmarks: normalMatches.map(em => ({ regex: em.entry.origRegex, anchorId: (em.entry as NormalBookmarkEntry).anchorId, block: text })),
                matchedAmbiguities: errorMatches.map(em => ({ regex: em.entry.origRegex, errorMessage: (em.entry as ErrorBookmarkEntry).errorText, block: text }))
            }
            throw 'Conflicting bookmark matched:\n' + JSON.stringify(errorObjs, null, 2);
        }
    }
}