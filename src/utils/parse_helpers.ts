import { StringStream } from "./stringstream";

export function breakOnSlashes(input: string) {
    const stream = new StringStream(input);

    const ret: string[] = []
    let current = '';
    while (stream.hasMore()) {
        if (stream.lookAhead(2) === '\\/') {
            stream.moveAhead(2);
            current += '/';
        } else if (stream.lookAhead(1) === '/') {
            ret.push(current);
            current = '';
            stream.moveAhead(1);
        } else {
            const char = stream.moveAhead(1);
            current += char;
        }
    }

    ret.push(current);

    return ret;
}

export function combineWithSlashes(input: string[]) {
    let current = '';
    for (const [idx, val] of input.entries()) {
        current += val.replace('/', '\\/')
        if (idx < input.length - 1) {
            current += '/'
        }
    }
    return current;
}