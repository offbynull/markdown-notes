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

    public getNormalBookmarkAnchorId(key: BookmarkKey): string | null {
        const found = this.entries.find(e => e.entry.origKey.regex === key.regex && e.entry.origKey.flags === key.flags);
        if (found === undefined) {
            throw 'Unable to get anchor ID because bookmark does not exist\n'
                + '\n'
                + 'Regex: ' + key.regex + '\n'
                + 'Flags: ' + key.flags + '\n';
        }

        if (!(found.entry instanceof NormalBookmarkEntry)) {
            throw 'Unable to get anchor ID because bookmark is not a normal bookmark\n'
                + '\n'
                + 'Regex: ' + key.regex + '\n'
                + 'Flags: ' + key.flags + '\n';
        }

        return found.entry.anchorId;
    }

    public findKeyByMatch(text: string): BookmarkKey | null {
        const finalMatch = this.findAndFilterDownToSingleMatch(text);
        if (finalMatch === null) {
            return null;
        } else {
            return finalMatch.entry.origKey;
        }
    }

    public scan(text: string): ScanResult | null {
        const finalMatch = this.findAndFilterDownToSingleMatch(text);
        
        // If nothing found or not enabled, return nuull
        if (finalMatch === null || finalMatch.entry.enabled === false) {
            return null;
        }

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
            const errorObj = {
                key: walkedToEntry.origKey,
                message: (walkedToEntry as ErrorBookmarkEntry).errorText,
                block: text,
                redirectChain: walkChain
            };
            throw 'Error Bookmark matched:\n' + JSON.stringify(errorObj, null, 2);
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

    private findAndFilterDownToSingleMatch(text: string): CaptureEntry | null {
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

        // Sort by earliest matches on the full capture
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.fullIndex < b.capture.fullIndex ? -1 : 1);
        const earliestFullMatchIdx = filterMatches[0].capture.captureIndex;
        filterMatches = filterMatches.filter(m => m.capture.captureIndex === earliestFullMatchIdx);

        // Sort by longest matches on the capture group
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.captureMatch.length > b.capture.captureMatch.length ? -1 : 1);
        const longestCaptureMatchIdx = filterMatches[0].capture.captureMatch.length;
        filterMatches = filterMatches.filter(m => m.capture.captureMatch.length === longestCaptureMatchIdx);

        // Sort by longest matches on full capture
        filterMatches = filterMatches.slice().sort((a, b) => a.capture.fullMatch.length > b.capture.fullMatch.length ? -1 : 1);
        const longestFullMatchIdx = filterMatches[0].capture.fullMatch.length;
        filterMatches = filterMatches.filter(m => m.capture.fullMatch.length === longestFullMatchIdx);

        // Ensure single match and return
        if (filterMatches.length > 1) {
            const errorObjs = {
                matchedBookmarks: filterMatches
                    .filter(m => m.entry instanceof NormalBookmarkEntry)
                    .map(em => ({ regex: em.entry.origKey, anchorId: (em.entry as NormalBookmarkEntry).anchorId, block: text })),
                matchedAmbiguities: filterMatches
                    .filter(m => m.entry instanceof ErrorBookmarkEntry)
                    .map(em => ({ regex: em.entry.origKey, errorMessage: (em.entry as ErrorBookmarkEntry).errorText, block: text }))
            };
            throw 'Conflicting bookmarks matched:\n' + JSON.stringify(errorObjs, null, 2);
        } else if (filterMatches.length === 1) {
            return filterMatches[0];
        }
        
        throw 'This should never happen'; // input matches should have had at least 1 element
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