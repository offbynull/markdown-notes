import { StringStream } from "./stringstream";

test('must lookahead', () => {
    const ss = new StringStream('abcde');
    expect(ss.lookAhead(2)).toBe('ab');
});

test('must not lookahead past end', () => {
    const ss = new StringStream('abcde');
    expect(ss.lookAhead(6)).toBeUndefined();
});

test('must move ahead', () => {
    const ss = new StringStream('abcde');
    expect(ss.moveAhead(3)).toBe('abc');
    expect(ss.lookAhead(1)).toBe('d');
});

test('must move ahead', () => {
    const ss = new StringStream('abcde');
    expect(ss.moveAhead(3)).toBe('abc');
    expect(ss.lookAhead(1)).toBe('d');
});

test('must mark and reset', () => {
    const ss = new StringStream('abcde');
    ss.moveAhead(1);
    ss.mark();
    ss.moveAhead(2);
    ss.reset();
    expect(ss.lookAhead(1)).toBe('b');
});

test('must mark and reset (nested)', () => {
    const ss = new StringStream('abcde');
    ss.mark();
    expect(ss.moveAhead(1)).toBe('a');
    ss.mark();
    expect(ss.moveAhead(1)).toBe('b');
    ss.mark();
    expect(ss.moveAhead(1)).toBe('c');
    ss.reset();
    expect(ss.moveAhead(1)).toBe('c');
    ss.reset();
    expect(ss.moveAhead(1)).toBe('b');
    ss.reset();
    expect(ss.moveAhead(1)).toBe('a');
});

test('must access index', () => {
    const ss = new StringStream('abcde');
    ss.moveAhead(3);
    expect(ss.hasMore()).toBe(true);
    expect(ss.index()).toBe(3);
    ss.moveAhead(2);
    expect(ss.hasMore()).toBe(false);
    expect(ss.index()).toBe(5);
});