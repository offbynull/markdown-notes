import { StringStream } from "./stringstream";

class ParseData {
    private nextOrigCaptureIndex: number = 1;
    private readonly captureGroupMapping: number[] = [];
    private modifiedRegex: string = '';

    public artificialGroup() {
        this.captureGroupMapping.push(-1);
    }

    public originalGroup() {
        this.captureGroupMapping.push(this.nextOrigCaptureIndex);
        this.nextOrigCaptureIndex++;
    }

    public next(): number {
        const ret = this.nextOrigCaptureIndex;
        this.nextOrigCaptureIndex++;
        return ret;
    }

    public appendRegion(region: string) {
        this.modifiedRegex += region;
    }

    public getCaptureGroups() {
        return this.captureGroupMapping.slice();
    }

    public getModifiedRegex() {
        return this.modifiedRegex;
    }
}

function parseMain(stream: StringStream): ParseData {
    const cgt = new ParseData();

    let regionStartIdx = 0;
    while (stream.hasMore()) {
        const nextChar = stream.lookAhead(1);
        if (nextChar === '(') {
            const next2Chars = stream.lookAhead(2);
            if (next2Chars === undefined) {
                throw 'Non-closing parenthesis found';
            } else if (next2Chars === '(?') {
                // this isn't a capture group, just move over it
                parseCapture(stream, cgt); // parse over it so it moves, but don't do anything with th result
            } else {
                // this is a capture group, go into it
                // ... but before you do, the stuff before it is a capture group
                const newStart = regionStartIdx;
                const newEnd = stream.index();
                if (newStart !== newEnd) {
                    const newGroup = '(' + stream.data().slice(newStart, newEnd) + ')';
                    cgt.appendRegion(newGroup);
                    cgt.artificialGroup();
                }

                // ... then process the capture group itself
                const origStart = stream.index();
                parseCapture(stream, cgt);
                const origEnd = stream.index();
                const origGroup = stream.data().slice(origStart, origEnd);  // should already be encapsulated in parenthesis
                cgt.appendRegion(origGroup);
                cgt.originalGroup();

                // update index to start from for next region
                regionStartIdx = origEnd;
            }
        } else if (nextChar === '[') {
            // this is a character class, go into it
            parseCharacterClass(stream);
        } else if (nextChar === '\\') {
            stream.moveAhead(2); // move ahead by 2 because next char is escaped
        } else {
            stream.moveAhead(1);
        }
    }

    // add group for last remaining chunk
    const newStart = regionStartIdx;
    const newEnd = stream.index();
    if (newStart !== newEnd) {
        const newGroup = '(' + stream.data().slice(newStart, newEnd) + ')';
        cgt.appendRegion(newGroup);
        cgt.artificialGroup();
    }

    return cgt;
}

function parseCapture(stream: StringStream, cgt: ParseData) {
    const startChar = stream.moveAhead(1);
    if (startChar !== '(') {
        throw 'Not in capture group';
    }

    while (stream.hasMore()) {
        const nextChar = stream.lookAhead(1);
        if (nextChar === '(') {
            const next2Chars = stream.lookAhead(2);
            if (next2Chars === undefined) {
                throw 'Non closing parenthesis found';
            } else if (next2Chars === '(?') {
                // this isn't a capture group, just move over it
                stream.moveAhead(2);
            } else {
                // this is a capture group, go into it
                cgt.originalGroup(); // insert everything for this capture group we're going to go into
                parseCapture(stream, cgt);
            }
        } else if (nextChar == ')') {
            stream.moveAhead(1);
            return;
        } else if (nextChar === '[') {
            // this is a character class, go into it
            parseCharacterClass(stream);
        } else if (nextChar === '\\') {
            stream.moveAhead(2); // move ahead by 2 because next char is escaped
        } else {
            stream.moveAhead(1);
        }
    }
}

function parseCharacterClass(stream: StringStream) {
    const startChar = stream.moveAhead(1);
    if (startChar !== '[') {
        throw 'Not in character class';
    }

    while (stream.hasMore()) {
        const nextChar = stream.lookAhead(1);
        if (nextChar === ']') {
            stream.moveAhead(1);
            return;
        } else if (nextChar === '\\') {
            stream.moveAhead(2); // move ahead by 2 because next char is escaped
        } else {
            stream.moveAhead(1);
        }
    }
}




export function groupify(regex: string) {
    const parseData = parseMain(new StringStream(regex));

    const modifiedRegex = parseData.getModifiedRegex();
    const groupMappings = parseData.getCaptureGroups();
    groupMappings.unshift(0); // group 0 is an implict group that means the whole thing -- 0 always maps to 0

    return {
        regex: modifiedRegex,
        groupMappings: groupMappings
    }
}




export function parseRegexLiteral(regex: string) {
    const stream = new StringStream(regex);

    if (stream.moveAhead(1) !== '/') {
        throw 'Must start with /';
    }

    let regexValue = '';
    let regexFlags = '';
    while (true) {
        if (stream.hasMore() === false) {
            throw 'Unclosed regex literal'
        }

        if (stream.lookAhead(2) === '\\/') {
            stream.moveAhead(2);
            regexValue += '/';
        } else if (stream.lookAhead(1) === '/') {
            regexValue = regex.substring(1, stream.index());
            break;
        } else {
            const char = stream.moveAhead(1);
            regexValue += char;
        }
    }

    regexFlags = regex.substring(stream.index() + 1);

    return {
        regex: regexValue,
        flags: regexFlags
    };
}