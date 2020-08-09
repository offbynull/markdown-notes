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

import { BookmarkRegexScanner, BookmarkRegexCapture } from "./bookmark_regex_scanner";

export class BookmarkKey {
    public constructor(
        public readonly regex: string,
        public readonly flags: string
    ) {}
}

abstract class BookmarkEntry {
    public enabled: boolean = true;
    public redirectKey: BookmarkKey | null = null;
    protected constructor(
        public readonly origKey: BookmarkKey, // original regex info
        public readonly showPreamble: boolean,
        public readonly showPostamble: boolean
    ) {}
}

export class NormalBookmarkEntry extends BookmarkEntry {
    public constructor(
        origKey: BookmarkKey,
        showPreamble: boolean,
        showPostamble: boolean,
        public readonly anchorId: string | null) {
        super(origKey, showPreamble, showPostamble);
    }
}

export class ErrorBookmarkEntry extends BookmarkEntry {
    public constructor(
        origKey: BookmarkKey,
        showPreamble: boolean,  // this flag only has an effect if the error bookmark gets redirected to a normal bookmark
        showPostamble: boolean, // this flag only has an effect if the error bookmark gets redirected to a normal bookmark
        public readonly errorText: string) {
        super(origKey, showPreamble, showPostamble);
    }
}

export interface ScannerEntry {
    scanner: BookmarkRegexScanner;
    entry: BookmarkEntry;
}

export  interface CaptureEntry {
    capture: BookmarkRegexCapture;
    entry: BookmarkEntry;
}

export class BookmarkRegexScannerCollection {
    private readonly entries: ScannerEntry[] = [];

    public addNormalBookmark(key: BookmarkKey, anchorId: string | null, showPreamble: boolean, showPostamble: boolean) {
        const entry = new NormalBookmarkEntry(key, showPreamble, showPostamble, anchorId);

        const scanner = BookmarkRegexScanner.create(key.regex, key.flags);
        this.entries.push({ scanner: scanner, entry: entry });
    }

    public addErrorBookmark(key: BookmarkKey, showPreamble: boolean, showPostamble: boolean, errorMessage: string) {
        const entry = new ErrorBookmarkEntry(key, showPreamble, showPostamble, errorMessage);

        const scanner = BookmarkRegexScanner.create(key.regex, key.flags);
        this.entries.push({ scanner: scanner, entry: entry });
    }

    public enableBookmark(key: BookmarkKey, enabled: boolean) {
        const found = this.entries.find(e => e.entry.origKey.regex === key.regex && e.entry.origKey.flags === key.flags);
        if (found === undefined) {
            throw 'Unable to disable because bookmark does not exist\n'
                + '\n'
                + 'Regex: ' + key.regex + '\n'
                + 'Flags: ' + key.flags + '\n';
        }

        found.entry.enabled = enabled;
    }

    public redirectBookmark(fromKey: BookmarkKey, toKey: BookmarkKey | null) {
        const fromFound = this.entries.find(e => e.entry.origKey.regex === fromKey.regex && e.entry.origKey.flags === fromKey.flags);
        if (fromFound === undefined) {
            throw 'Unable to redirect because source bookmark does not exist\n'
                + '\n'
                + 'Source regex: ' + fromKey.regex + '\n'
                + 'Source flags: ' + fromKey.flags + '\n';
        }

        if (toKey !== null) {
            const toFound = this.entries.find(e => e.entry.origKey.regex === toKey.regex && e.entry.origKey.flags === toKey.flags);
            if (toFound === undefined) {
                throw 'Unable to redirect because destination bookmark does not exist\n'
                    + '\n'
                    + 'Destination regex: ' + toKey.regex + '\n'
                    + 'Destination flags: ' + toKey.flags + '\n';
            }
        }

        fromFound.entry.redirectKey = toKey;
    }

    public scan(text: string): ScanResult | null {
        const matches: CaptureEntry[] = [];
        for (const entry of this.entries) {
            if (entry.entry.enabled === false) {
                continue;
            }

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
        const earliestCaptureMatchIdx = filterMatches[0].capture.captureIndex;
        filterMatches = filterMatches.filter(m => m.capture.captureIndex === earliestCaptureMatchIdx);

        // Sort by longest matches on the capture group
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.captureMatch.length > b.capture.captureMatch.length ? -1 : 1);
        const longestCaptureMatchIdx = filterMatches[0].capture.captureMatch.length;
        filterMatches = filterMatches.filter(m => m.capture.captureMatch.length === longestCaptureMatchIdx);

        // Sort by longest matches on full capture
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.fullMatch.length > b.capture.fullMatch.length ? -1 : 1);
        const longestFullMatchIdx = filterMatches[0].capture.fullMatch.length;
        filterMatches = filterMatches.filter(m => m.capture.fullMatch.length === longestFullMatchIdx);

        // If any of the remaining matches were error matches, only return the error match if nothing else was matched. For example, imagine the following markup...
        //    `{bm} base/(base)_nucleotide/i`
        //    `{bm} base/(base)_pH/i`
        //    `{bm-ambiguous} Disambiguate using either base_pH or base_nucleotide/(base)/i`
        // ...the term base_pH will match both the 2nd bookmark and the error, but base_pH is clearly correct. No error should be thrown.
        const normalMatches = filterMatches.filter(m => m.entry instanceof NormalBookmarkEntry);
        const errorMatches = filterMatches.filter(m => m.entry instanceof ErrorBookmarkEntry);
        const finalMatch = (() => {
            if (normalMatches.length === 0 && errorMatches.length >= 1) { // nothing matched except for errors -- show the errors
                return errorMatches[0];
            } else if (normalMatches.length === 1) { // exactly 1 thing matched -- ignore any errors that may have matched as well (for reasoning discussed in block comment above)
                return normalMatches[0];
            } else {
                const errorObjs = {
                    matchedBookmarks: normalMatches.map(em => ({ regex: em.entry.origKey, anchorId: (em.entry as NormalBookmarkEntry).anchorId, block: text })),
                    matchedAmbiguities: errorMatches.map(em => ({ regex: em.entry.origKey, errorMessage: (em.entry as ErrorBookmarkEntry).errorText, block: text }))
                }
                throw 'Conflicting bookmark matched:\n' + JSON.stringify(errorObjs, null, 2);
            }
        })();

        // If redirected, walk to the final target
        let walkedToEntry = finalMatch.entry;
        let walkedToKey = finalMatch.entry.redirectKey;
        const walkChain: BookmarkKey[] = [];
        while (walkedToKey !== null) {
            walkChain.push(walkedToKey);
            
            // Go to next
            const currRedirectKey = walkedToKey;
            const dst = this.entries.find(e => e.entry.origKey.regex === currRedirectKey.regex && e.entry.origKey.flags === currRedirectKey.flags);
            if (dst === undefined) {
                throw 'This should never happen'; // destination must have existed when redirect was defined
            }

            // Update entries
            walkedToEntry = dst.entry;

            // Get next redirect key
            const nextRedirectKey = dst.entry.redirectKey;
            if (nextRedirectKey === null) {
                break;
            }
            if (walkChain.find(c => c.regex === nextRedirectKey.regex && c.flags === nextRedirectKey.flags) !== undefined) {
                throw 'Redirect loop detected:\n\n' + JSON.stringify(walkChain)
            }
            walkedToKey = nextRedirectKey;
        }

        // Return
        if (walkedToEntry instanceof ErrorBookmarkEntry) {
            const errorObjs = {
                matchedAmbiguities: errorMatches.map(em => ({ regex: em.entry.origKey, errorMessage: (em.entry as ErrorBookmarkEntry).errorText, block: text })),
                redirectChain: walkChain
            };
            throw 'Bookmark disambiguation errors matched:\n' + JSON.stringify(errorObjs, null, 2);
        } else if (walkedToEntry instanceof NormalBookmarkEntry) {
            return {
                fullIndex: finalMatch.capture.fullIndex,
                fullMatch: finalMatch.capture.fullMatch,
                captureIndex: finalMatch.capture.captureIndex,
                captureMatch: finalMatch.capture.captureMatch,
                capturePreamble: finalMatch.entry.showPreamble ? finalMatch.capture.capturePreamble : null,
                capturePostamble: finalMatch.entry.showPostamble ? finalMatch.capture.capturePostamble : null,
                key: finalMatch.entry.origKey,
                anchorId: walkedToEntry.anchorId
            };
        } else {
            throw 'This should never happen'
        }
    }
}

export interface ScanResult {
    fullIndex: number,
    fullMatch: string,
    captureIndex: number,
    captureMatch: string,
    capturePreamble: string | null,
    capturePostamble: string | null,
    key: BookmarkKey,
    anchorId: string | null   // null means that is match is for an error
}