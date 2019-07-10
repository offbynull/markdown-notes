import { groupify, parseRegexLiteral } from "./regex";

test('must groupify when no groups', () => {
    const groupifyOutput = groupify('abcdefg');
    expect(groupifyOutput).toStrictEqual({
        regex: '(abcdefg)',
        groupMappings: [ 0, -1 ]
    });
});

test('must groupify when everything grouped', () => {
    const groupifyOutput = groupify('(abcdefg)');
    expect(groupifyOutput).toStrictEqual({
        regex: '(abcdefg)',
        groupMappings: [ 0, 1 ]
    });
});

test('must groupify when there\'s 1 partial group in the middle', () => {
    const groupifyOutput = groupify('a(bcdef)g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(bcdef)(g)',
        groupMappings: [ 0, -1, 1, -1 ]
    });
});

test('must groupify when there\'s 1 partial group in the beginning', () => {
    const groupifyOutput = groupify('(abcdef)g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(abcdef)(g)',
        groupMappings: [ 0, 1, -1 ]
    });
});

test('must groupify when there\'s 1 partial group in the end', () => {
    const groupifyOutput = groupify('a(bcdefg)');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(bcdefg)',
        groupMappings: [ 0, -1, 1 ]
    });
});

test('must groupify when there\'s 2 partial groups in the middle', () => {
    const groupifyOutput = groupify('a(b)cde(f)g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(b)(cde)(f)(g)',
        groupMappings: [ 0, -1, 1, -1, 2, -1 ]
    });
});

test('must groupify when there\'s 2 partial groups in beginning and end', () => {
    const groupifyOutput = groupify('(a)bcdef(g)');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(bcdef)(g)',
        groupMappings: [ 0, 1, -1, 2 ]
    });
});

test('must properly handle nested groups', () => {
    const groupifyOutput = groupify('a(bc(d)ef)g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(bc(d)ef)(g)',
        groupMappings: [ 0, -1, 1, 2, -1 ]
    });
});

test('must groupify when there are character classes with parenthesis in them', () => {
    const groupifyOutput = groupify('[(a)]bcdef[(g)]');
    expect(groupifyOutput).toStrictEqual({
        regex: '([(a)]bcdef[(g)])',
        groupMappings: [ 0, -1 ]
    });
});

test('must groupify but ignore when group isn\'t a capture group', () => {
    const groupifyOutput = groupify('(?:ab)(cdefg)');
    expect(groupifyOutput).toStrictEqual({
        regex: '((?:ab))(cdefg)',
        groupMappings: [ 0, -1, 1 ]
    });
});

test('must ignore escaped paranthesis when grouping (top-level)', () => {
    const groupifyOutput = groupify('\\(abcdefg\\)');
    expect(groupifyOutput).toStrictEqual({
        regex: '(\\(abcdefg\\))',
        groupMappings: [ 0, -1 ]
    });
});

test('must ignore escaped paranthesis when grouping (nested-level)', () => {
    const groupifyOutput = groupify('a(bc\\(d\\)ef)g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(bc\\(d\\)ef)(g)',
        groupMappings: [ 0, -1, 1, -1 ]
    });
});

test('must ignore escaped square brackets when grouping', () => {
    const groupifyOutput = groupify('a(bc\\[d\\]ef)g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a)(bc\\[d\\]ef)(g)',
        groupMappings: [ 0, -1, 1, -1 ]
    });
});

test('must ignore escaped square brackets when in character group', () => {
    const groupifyOutput = groupify('a\\[(d\\])g');
    expect(groupifyOutput).toStrictEqual({
        regex: '(a\\[)(d\\])(g)',
        groupMappings: [ 0, -1, 1, -1 ]
    });
});






test('must parse literal with no flags', () => {
    const res = parseRegexLiteral('/abcd/');
    expect(res).toStrictEqual({
        regex: 'abcd',
        flags: ''
    });
});

test('must parse literal with flags', () => {
    const res = parseRegexLiteral('/abcd/gmi');
    expect(res).toStrictEqual({
        regex: 'abcd',
        flags: 'gmi'
    });
});

test('must parse literal with escape sequence', () => {
    const res = parseRegexLiteral('/abc\\/d/gmi');
    expect(res).toStrictEqual({
        regex: 'abc\\/d',
        flags: 'gmi'
    });
});

test('must parse garbage characters in flags', () => {
    const res = parseRegexLiteral('/abcd/abcdef///');
    expect(res).toStrictEqual({
        regex: 'abcd',
        flags: 'abcdef///'
    });
});

test('must fail to parse if no starting slash', () => {
    expect(() => parseRegexLiteral('abcd/abcdef///')).toThrow();
});

test('must fail to parse if no ending slash', () => {
    expect(() => parseRegexLiteral('/abcd')).toThrow();
});
