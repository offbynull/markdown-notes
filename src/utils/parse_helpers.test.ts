import { breakOnSlashes } from "./parse_helpers";

test('must break slashes', () => {
    expect(breakOnSlashes('abcd/efg/123')).toStrictEqual([
        'abcd',
        'efg',
        '123'
    ]);
});

test('must break to single item if no slashses', () => {
    expect(breakOnSlashes('abcd')).toStrictEqual([
        'abcd'
    ]);
});

test('must include empty item at end if ends with a slash', () => {
    expect(breakOnSlashes('abcd/')).toStrictEqual([
        'abcd',
        ''
    ]);
});

test('must include empty item at beginning if begins with a slash', () => {
    expect(breakOnSlashes('/abcd')).toStrictEqual([
        '',
        'abcd'
    ]);
});

test('must include empty items', () => {
    expect(breakOnSlashes('///')).toStrictEqual([
        '',
        '',
        '',
        ''
    ]);
});

test('must properly escape', () => {
    expect(breakOnSlashes('/\\//')).toStrictEqual([
        '',
        '/',
        ''
    ]);
});