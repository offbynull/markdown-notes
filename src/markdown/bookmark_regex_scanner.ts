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

import { parseRegexLiteral, groupify } from "../utils/regex";

//
// Bookmark scanning logic -- visible for testing
//
// This scans for a block of text for a SINGLE regex (just ONE regex).
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