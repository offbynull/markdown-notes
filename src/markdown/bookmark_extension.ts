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

abstract class BookmarkEntry {
    public readonly origRegex: string; // original regex
    protected constructor(origRegex: string) {
        this.origRegex = origRegex;
    }
}

class NormalBookmarkEntry extends BookmarkEntry {
    public readonly anchorId: string;
    public readonly label: string;
    public constructor(origRegex: string, label: string, anchorId: string) {
        super(origRegex);
        this.label = label;
        this.anchorId = anchorId;
    }
}

class ErrorBookmarkEntry extends BookmarkEntry {
    public readonly errorText: string;
    public constructor(origRegex: string, errorMessage: string) {
        super(origRegex);
        this.errorText = errorMessage;
    }
}

class BookmarkData {
    public readonly scanner = new BookmarkScannerList<BookmarkEntry>(); // bookmark regex to entry
    public readonly lookup = new Map<string, BookmarkEntry>(); // anchor id to entry
    public nextId = 0;
}

export class BookmarkReferenceIgnoreExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
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
        new TokenIdentifier('bm', Type.INLINE),
        new TokenIdentifier('bm-a', Type.INLINE),
        new TokenIdentifier('bm-e', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): void {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        const anchorId = "BOOKMARK" + bookmarkData.nextId;
        bookmarkData.nextId++;

        const token = tokens[tokenIdx];
        switch (token.type) {
            case 'bm': {
                const label = token.content;
                const regex = '(' + token.content + ')';
                const flags = 'i';
                
                const entry = new NormalBookmarkEntry(regex, label, anchorId);
                bookmarkData.lookup.set(anchorId, entry);
                bookmarkData.scanner.add(regex, flags, entry);
                break;
            }
            case 'bm-a': {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 3) {
                    throw 'Advanced bookmark tags require exactly 3 parameters separated by slashes: label/regex/regex_flags';
                }
                const label = broken[0];
                const regex = broken[1];
                const flags = broken[2];

                const entry = new NormalBookmarkEntry(regex, label, anchorId);
                bookmarkData.lookup.set(anchorId, entry);
                bookmarkData.scanner.add(regex, flags, entry);
                break;
            }
            case 'bm-e': {
                const broken = breakOnSlashes(token.content);
                if (broken.length !== 3) {
                    throw 'Error bookmark tags require exactly 3 parameters separated by slashes: error_text/regex/regex_flags';
                }
                const errorText = broken[0];
                const regex = broken[1];
                const flags = broken[2];

                const entry = new ErrorBookmarkEntry(regex, errorText);
                bookmarkData.lookup.set(anchorId, entry);
                bookmarkData.scanner.add(regex, flags, entry);
                break;
            }
            default:
                throw 'This should never happen';
        }

        token.content = anchorId;
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

                const startMatchIdx = scanResult.capture.index;
                const endMatchIdx = scanResult.capture.index + scanResult.capture.match.length;

                const preText = content.substring(0, startMatchIdx);
                const matchText = scanResult.capture.captureMatch;
                const postText = content.substring(endMatchIdx);

                const bookmarkEntry = scanResult.data;
                if (bookmarkEntry instanceof ErrorBookmarkEntry == true) {
                    throw bookmarkEntry.origRegex
                        + ' bookmarked and requires disambiguation: '
                        + (bookmarkEntry as ErrorBookmarkEntry).errorText;
                } else if (bookmarkEntry instanceof NormalBookmarkEntry === false) {
                    throw 'Not a normal bookmark entry'; // this should never happen
                }

                const normalBookmarkEntry = bookmarkEntry as NormalBookmarkEntry;

                const bookmarkTokens = [
                    new Token('text', '', 0), // pre text
                    new Token('bookmark_link_open', 'a', 1),
                    new Token('text', '', 0), // link text
                    new Token('bookmark_link_close', 'a', -1)
                ];
                bookmarkTokens[0].content = preText;
                bookmarkTokens[1].attrSet('href', '#' + markdownIt.utils.escapeHtml(normalBookmarkEntry.anchorId));
                bookmarkTokens[2].content = matchText;

                replacementTokens = replacementTokens.concat(bookmarkTokens);
                content = postText;
            }

            // Replace in full tokens
            tokens.splice(tokenIdx, 1, ...replacementTokens); // Replace old token with new tokens 
            tokenIdx += replacementTokens.length - 1;         // Adjust the index to account for the change
        }
    }
    
    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const bookmarkData: BookmarkData = context.shared.get('bookmark') || new BookmarkData();
        context.shared.set('bookmark', bookmarkData);

        const token = tokens[tokenIdx];

        const anchorId = token.content;

        const bookmarkEntry = bookmarkData.lookup.get(anchorId);
        if (bookmarkEntry === undefined) {
            throw 'Undefined bookmark when rendering: ' + anchorId; // this should never happen
        } else if (bookmarkEntry instanceof NormalBookmarkEntry === true) {
            const normalBookmarkEntry = bookmarkEntry as NormalBookmarkEntry;
            const label = normalBookmarkEntry.label;
            return `<a name="${markdownIt.utils.escapeHtml(anchorId)}"></a><strong>${markdownIt.utils.escapeHtml(label)}</strong>`;
        } else if (bookmarkEntry instanceof ErrorBookmarkEntry === true) {
            return ''; // error bookmark tags don't get rendered
        } else {
            throw 'Unrecognized bookmark type: ' + anchorId; // this should never happen
        }
        
    }
}





















//
// Bookmark scanning logic -- visible for testing.
//


export interface BookmarkCapture {
    index: number,
    match: string,
    captureIndex: number,
    captureMatch: string
};

export class BookmarkScanner {
    private readonly regexp: RegExp;
    private readonly groupMappings: ReadonlyArray<number>;
    
    static create(regex: string, flags: string) {
        const groupifiedRegex = groupify(regex);
        
        const group1Exists = groupifiedRegex.groupMappings.filter(m => m === 1).length === 1;
        const extraGroupsExist = groupifiedRegex.groupMappings.filter(m => m !== -1 && m !== 0 && m !== 1).length > 0;
        if (group1Exists === false || extraGroupsExist === true) {
            throw 'Bookmark regex must contain exactly 1 explicit capture group (not more or less): ' + regex;
        }

        return new BookmarkScanner(
            new RegExp(groupifiedRegex.regex, flags),
            groupifiedRegex.groupMappings
        );
    }
    static createFromLiteral(regexLiteral: string) {
        const parsedRegexLiteral = parseRegexLiteral(regexLiteral);
    
        return BookmarkScanner.create(parsedRegexLiteral.regex, parsedRegexLiteral.flags);
    }

    private constructor(regexp: RegExp, groupMappings: number[]) {
        this.regexp = regexp;
        this.groupMappings = groupMappings;
    }

    public scan(text: string): BookmarkCapture | null {
        this.regexp.lastIndex = 0;
        const execRes = this.regexp.exec(text);
        if (execRes === null) {
            return null;
        }

        let nextStartIdx = execRes.index;
        for (let i = 1; i < this.groupMappings.length; i++) {
            const groupMapping = this.groupMappings[i];
            const groupText = execRes[i];
            if (groupMapping === 1) {
                return {
                    index: execRes.index,
                    match: execRes[0],
                    captureIndex: nextStartIdx,
                    captureMatch: groupText
                };
            }

            nextStartIdx += groupText.length;
        }

        throw 'This should never happen'; // we have have at least capture group 1
    }
}

interface ListEntry<T> {
    scanner: BookmarkScanner;
    data: T;
}

export interface ListScanResult<T> {
    capture: BookmarkCapture;
    data: T;
}

export class BookmarkScannerList<T> {
    private readonly entries: ListEntry<T>[] = [];

    public add(regex: string, flags: string, data: T) {
        const scanner = BookmarkScanner.create(regex, flags);
        this.entries.push({ scanner: scanner, data: data });
    }

    public addLiteral(regexLiteral: string, data: T) {
        const scanner = BookmarkScanner.createFromLiteral(regexLiteral);
        this.entries.push({ scanner: scanner, data: data });
    }

    public scan(text: string): ListScanResult<T> | null {
        const matches: ListScanResult<T>[] = [];
        for (const entry of this.entries) {
            const match = entry.scanner.scan(text);
            if (match !== null) {
                matches.push({
                    capture: match,
                    data: entry.data
                });
            }
        }

        if (matches.length === 0) {
            return null;
        }

        let filterMatches = matches.slice().sort((a, b) => a.capture.captureIndex < b.capture.captureIndex ? -1 : 1);
        const earliestMatchIdx = filterMatches[0].capture.captureIndex;
        filterMatches = filterMatches.filter(m => m.capture.captureIndex === earliestMatchIdx);

        filterMatches = filterMatches.slice().sort((a, b) => a.capture.captureMatch > b.capture.captureMatch ? -1 : 1);
        const longestMatchIdx = filterMatches[0].capture.captureMatch.length;
        filterMatches = filterMatches.filter(m => m.capture.captureMatch.length === longestMatchIdx);

        if (filterMatches.length !== 1) {
            throw 'Conflicting regex matches: ' + JSON.stringify(filterMatches);
        }

        return filterMatches[0];
    }
}