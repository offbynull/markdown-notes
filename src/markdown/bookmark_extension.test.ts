import { BookmarkRegexScanner, BookmarkScannerList } from "./bookmark_extension";

test('must scan for bookmark', () => {
    const scanner = BookmarkRegexScanner.createFromLiteral('/(fgh)/');
    const bookmarkCapture = scanner.scan('abcdefghjiklmnopqrstuvwxyz');

    if (bookmarkCapture === null) {
        throw 'Should not happen';
    }

    expect(bookmarkCapture).toStrictEqual({
        fullIndex: 5,
        fullMatch: 'fgh',
        captureIndex: 5,
        captureMatch: 'fgh',
        capturePreamble: '',
        capturePostamble: ''
    });
});

test('must scan for bookmark using partial and flags', () => {
    const scanner = BookmarkRegexScanner.createFromLiteral('/DE(fGh)JIKL/i');
    const bookmarkCapture = scanner.scan('abcdefghjiklmnopqrstuvwxyz');

    if (bookmarkCapture === null) {
        throw 'Should not happen';
    }

    expect(bookmarkCapture).toStrictEqual({
        fullIndex: 3,
        fullMatch: 'defghjikl',
        captureIndex: 5,
        captureMatch: 'fgh',
        capturePreamble: 'de',
        capturePostamble: 'jikl'
    });
});

test('must fail to create scanner if no capture group specified', () => {
    expect(() => BookmarkRegexScanner.createFromLiteral('/DEfGhJIKL/i')).toThrow();
});

test('must fail to create scanner if more than 1 capture group specified', () => {
    expect(() => BookmarkRegexScanner.createFromLiteral('/D(E)fG(h)JIKL/i')).toThrow();
});

test('must fail to create scanner if not a javascript regex literal', () => {
    expect(() => BookmarkRegexScanner.createFromLiteral('D(E)fG(h)JIKL')).toThrow();
});






test('must match the earliest match out of list', () => {
    const scannerList = new BookmarkScannerList();
    scannerList.addNormalBookmark('f(ghj)i', '', 'anchor1', false, false);
    scannerList.addNormalBookmark('e(fgh)j', '', 'anchor2', false, false);
    scannerList.addNormalBookmark('g(hji)k', '', 'anchor3', false, false);
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        capture: {
            fullIndex: 4,
            fullMatch: 'efghj',
            captureIndex: 5,
            captureMatch: 'fgh',
            capturePreamble: 'e',
            capturePostamble: 'j',
        },
        anchorId: 'anchor2'
    });
});

test('must match the longest match if multiple earliest bookmarks', () => {
    const scannerList = new BookmarkScannerList();
    scannerList.addNormalBookmark('f(ghji)k', '', 'anchor1', false, false);
    scannerList.addNormalBookmark('f(ghj)i', '', 'anchor2', false, false);
    scannerList.addNormalBookmark('f(ghjik)l', '', 'anchor3', false, false);
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        capture: {
            captureIndex: 6,
            captureMatch: "ghjik",
            capturePreamble: 'f',
            capturePostamble: 'l',
            fullIndex: 5,
            fullMatch: "fghjikl"
        },
        anchorId: 'anchor3'
    });
});


test('must match multiple times', () => {
    const scannerList = new BookmarkScannerList();
    scannerList.addNormalBookmark('(abc)', '', 'anchor1', false, false);
    expect(scannerList.scan('xxxabcxxx')).toStrictEqual({
        capture: {
            captureIndex: 3,
            captureMatch: 'abc',
            capturePreamble: '',
            capturePostamble: '',
            fullIndex: 3,
            fullMatch: 'abc'
        },
        anchorId: 'anchor1'
    });
    expect(scannerList.scan('xabcxxxxx')).toStrictEqual({
        capture: {
            captureIndex: 1,
            captureMatch: 'abc',
            capturePreamble: '',
            capturePostamble: '',
            fullIndex: 1,
            fullMatch: 'abc'
        },
        anchorId: 'anchor1'
    });
    expect(scannerList.scan('xxxxxabcx')).toStrictEqual({
        capture: {
            captureIndex: 5,
            captureMatch: 'abc',
            capturePreamble: '',
            capturePostamble: '',
            fullIndex: 5,
            fullMatch: 'abc'
        },
        anchorId: 'anchor1'
    });
});

test('must include preamble and postamble', () => {
    const scannerList = new BookmarkScannerList();
    scannerList.addNormalBookmark('23(abc)32', '', 'anchor1', false, false);
    expect(scannerList.scan('123abc32111')).toStrictEqual({
        capture: {
            captureIndex: 3,
            captureMatch: 'abc',
            capturePreamble: '23',
            capturePostamble: '32',
            fullIndex: 1,
            fullMatch: '23abc32'
        },
        anchorId: 'anchor1'
    });
});