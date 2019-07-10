import { BookmarkScanner, BookmarkScannerList } from "./bookmark_extension";

test('must scan for bookmark', () => {
    const scanner = BookmarkScanner.createFromLiteral('/(fgh)/');
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
    const scanner = BookmarkScanner.createFromLiteral('/DE(fGh)JIKL/i');
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
    expect(() => BookmarkScanner.createFromLiteral('/DEfGhJIKL/i')).toThrow();
});

test('must fail to create scanner if more than 1 capture group specified', () => {
    expect(() => BookmarkScanner.createFromLiteral('/D(E)fG(h)JIKL/i')).toThrow();
});

test('must fail to create scanner if not a javascript regex literal', () => {
    expect(() => BookmarkScanner.createFromLiteral('D(E)fG(h)JIKL')).toThrow();
});






test('must match the earliest match out of list', () => {
    const scannerList = new BookmarkScannerList<undefined>();
    scannerList.addLiteral('/f(ghj)i/', undefined);
    scannerList.addLiteral('/e(fgh)j/', undefined);
    scannerList.addLiteral('/g(hji)k/', undefined);
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
        data: undefined
    });
});

test('must match the longest match if multiple earliest bookmarks', () => {
    const scannerList = new BookmarkScannerList<undefined>();
    scannerList.addLiteral('/f(ghji)k/', undefined);
    scannerList.addLiteral('/f(ghj)i/', undefined );
    scannerList.addLiteral('/f(ghjik)l/', undefined);
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        capture: {
            captureIndex: 6,
            captureMatch: "ghj",
            index: 5,
            match: "fghji"
        },
        data: undefined
    });
});


test('must match multiple times', () => {
    const scannerList = new BookmarkScannerList<undefined>();
    scannerList.addLiteral('/(abc)/', undefined);
    expect(scannerList.scan('xxxabcxxx')).toStrictEqual({
        capture: {
            captureIndex: 3,
            captureMatch: 'abc',
            index: 3,
            match: 'abc'
        },
        data: undefined
    });
    expect(scannerList.scan('xabcxxxxx')).toStrictEqual({
        capture: {
            captureIndex: 1,
            captureMatch: 'abc',
            index: 1,
            match: 'abc'
        },
        data: undefined
    });
    expect(scannerList.scan('xxxxxabcx')).toStrictEqual({
        capture: {
            captureIndex: 5,
            captureMatch: 'abc',
            index: 5,
            match: 'abc'
        },
        data: undefined
    });
});
