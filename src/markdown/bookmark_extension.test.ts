import { BookmarkRegexScanner, BookmarkScannerList } from "./bookmark_extension";

test('must scan for bookmark', () => {
    const scanner = BookmarkRegexScanner.createFromLiteral('/(fgh)/');
    const bookmarkCapture = scanner.scan('abcdefghjiklmnopqrstuvwxyz');

    if (bookmarkCapture === null) {
        throw 'Should not happen';
    }

    expect(bookmarkCapture).toStrictEqual({
        index: 5,
        match: 'fgh',
        captureIndex: 5,
        captureMatch: 'fgh'
    });
});

test('must scan for bookmark using partial and flags', () => {
    const scanner = BookmarkRegexScanner.createFromLiteral('/DE(fGh)JIKL/i');
    const bookmarkCapture = scanner.scan('abcdefghjiklmnopqrstuvwxyz');

    if (bookmarkCapture === null) {
        throw 'Should not happen';
    }

    expect(bookmarkCapture).toStrictEqual({
        index: 3,
        match: 'defghjikl',
        captureIndex: 5,
        captureMatch: 'fgh'
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
    scannerList.addNormalBookmark('f(ghj)i', '', 'anchor1');
    scannerList.addNormalBookmark('e(fgh)j', '', 'anchor2');
    scannerList.addNormalBookmark('g(hji)k', '', 'anchor3');
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        capture: {
            index: 4,
            match: 'efghj',
            captureIndex: 5,
            captureMatch: 'fgh'
        },
        anchorId: 'anchor2'
    });
});

test('must match the longest match if multiple earliest bookmarks', () => {
    const scannerList = new BookmarkScannerList();
    scannerList.addNormalBookmark('f(ghji)k', '', 'anchor1');
    scannerList.addNormalBookmark('f(ghj)i', '', 'anchor2');
    scannerList.addNormalBookmark('f(ghjik)l', '', 'anchor3');
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        capture: {
            captureIndex: 6,
            captureMatch: "ghjik",
            index: 5,
            match: "fghjikl"
        },
        anchorId: 'anchor3'
    });
});


test('must match multiple times', () => {
    const scannerList = new BookmarkScannerList();
    scannerList.addNormalBookmark('(abc)', '', 'anchor1');
    expect(scannerList.scan('xxxabcxxx')).toStrictEqual({
        capture: {
            captureIndex: 3,
            captureMatch: 'abc',
            index: 3,
            match: 'abc'
        },
        anchorId: 'anchor1'
    });
    expect(scannerList.scan('xabcxxxxx')).toStrictEqual({
        capture: {
            captureIndex: 1,
            captureMatch: 'abc',
            index: 1,
            match: 'abc'
        },
        anchorId: 'anchor1'
    });
    expect(scannerList.scan('xxxxxabcx')).toStrictEqual({
        capture: {
            captureIndex: 5,
            captureMatch: 'abc',
            index: 5,
            match: 'abc'
        },
        anchorId: 'anchor1'
    });
});
