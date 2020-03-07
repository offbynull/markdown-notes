import { BookmarkRegexScanner } from "./bookmark_regex_scanner";
import { BookmarkRegexScannerCollection, BookmarkKey, NormalBookmarkEntry } from "./bookmark_regex_scanner_collection";


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
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('e(fgh)j', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('g(hji)k', ''), 'anchor3', false, false);
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        fullIndex: 4,
        fullMatch: 'efghj',
        captureIndex: 5,
        captureMatch: 'fgh',
        capturePreamble: null,
        capturePostamble: null,
        key: new BookmarkKey('e(fgh)j', ''),
        anchorId: 'anchor2'
    });
});

test('must match the longest match if multiple earliest bookmarks', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghji)k', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('f(ghjik)l', ''), 'anchor3', false, false);
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        captureIndex: 6,
        captureMatch: "ghjik",
        capturePreamble: null,
        capturePostamble: null,
        fullIndex: 5,
        fullMatch: "fghjikl",
        key: new BookmarkKey('f(ghjik)l', ''),
        anchorId: 'anchor3'
    });
});


test('must match multiple times', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('(abc)', ''), 'anchor1', false, false);
    expect(scannerList.scan('xxxabcxxx')).toStrictEqual({
        captureIndex: 3,
        captureMatch: 'abc',
        capturePreamble: null,
        capturePostamble: null,
        fullIndex: 3,
        fullMatch: 'abc',
        key: new BookmarkKey('(abc)', ''),
        anchorId: 'anchor1'
    });
    expect(scannerList.scan('xabcxxxxx')).toStrictEqual({
        captureIndex: 1,
        captureMatch: 'abc',
        capturePreamble: null,
        capturePostamble: null,
        fullIndex: 1,
        fullMatch: 'abc',
        key: new BookmarkKey('(abc)', ''),
        anchorId: 'anchor1'
    });
    expect(scannerList.scan('xxxxxabcx')).toStrictEqual({
        captureIndex: 5,
        captureMatch: 'abc',
        capturePreamble: null,
        capturePostamble: null,
        fullIndex: 5,
        fullMatch: 'abc',
        key: new BookmarkKey('(abc)', ''),
        anchorId: 'anchor1'
    });
});

test('must include preamble and postamble', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('23(abc)32', ''), 'anchor1', true, true);
    expect(scannerList.scan('123abc32111')).toStrictEqual({
        captureIndex: 3,
        captureMatch: 'abc',
        capturePreamble: '23',
        capturePostamble: '32',
        fullIndex: 1,
        fullMatch: '23abc32',
        key: new BookmarkKey('23(abc)32', ''),
        anchorId: 'anchor1'
    });
});





test('must ignore disabled bookmarks', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('e(fgh)j', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('g(hji)k', ''), 'anchor3', false, false);
    scannerList.enableBookmark(new BookmarkKey('e(fgh)j', ''), false);
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        fullIndex: 5,
        fullMatch: 'fghji',
        captureIndex: 6,
        captureMatch: 'ghj',
        capturePreamble: null,
        capturePostamble: null,
        key: new BookmarkKey('f(ghj)i', ''),
        anchorId: 'anchor1'
    });
});










test('must redirect bookmark', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('e(fgh)j', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('g(hji)k', ''), 'anchor3', false, false);
    scannerList.redirectBookmark(
        new BookmarkKey('e(fgh)j', ''),
        new BookmarkKey('g(hji)k', '')
    );
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        fullIndex: 4,
        fullMatch: 'efghj',
        captureIndex: 5,
        captureMatch: 'fgh',
        capturePreamble: null,
        capturePostamble: null,
        key: new BookmarkKey('e(fgh)j', ''),
        anchorId: 'anchor3'
    });
});

test('must redirect bookmark multiple times', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('e(fgh)j', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('g(hji)k', ''), 'anchor3', false, false);
    scannerList.redirectBookmark(
        new BookmarkKey('e(fgh)j', ''),
        new BookmarkKey('g(hji)k', '')
    );
    scannerList.redirectBookmark(
        new BookmarkKey('g(hji)k', ''),
        new BookmarkKey('f(ghj)i', '')
    );
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        fullIndex: 4,
        fullMatch: 'efghj',
        captureIndex: 5,
        captureMatch: 'fgh',
        capturePreamble: null,
        capturePostamble: null,
        key: new BookmarkKey('e(fgh)j', ''),
        anchorId: 'anchor1'
    });
});

test('must redirect bookmark to disabled destination bookmark', () => { // disabling a bookmark just means that the linker won't pick it up if it directly sees it
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('e(fgh)j', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('g(hji)k', ''), 'anchor3', false, false);
    scannerList.enableBookmark(new BookmarkKey('g(hji)k', ''), false);
    scannerList.redirectBookmark(
        new BookmarkKey('e(fgh)j', ''),
        new BookmarkKey('g(hji)k', '')
    );
    const ret = scannerList.scan('abcdefghjiklmnopqrstuvwxyz');

    if (ret === null) {
        throw 'Should not happen';
    }

    expect(ret).toStrictEqual({
        fullIndex: 4,
        fullMatch: 'efghj',
        captureIndex: 5,
        captureMatch: 'fgh',
        capturePreamble: null,
        capturePostamble: null,
        key: new BookmarkKey('e(fgh)j', ''),
        anchorId: 'anchor3'
    });
});

test('must fail to redirect if in a cycle', () => {
    const scannerList = new BookmarkRegexScannerCollection();
    scannerList.addNormalBookmark(new BookmarkKey('f(ghj)i', ''), 'anchor1', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('e(fgh)j', ''), 'anchor2', false, false);
    scannerList.addNormalBookmark(new BookmarkKey('g(hji)k', ''), 'anchor3', false, false);
    scannerList.enableBookmark(new BookmarkKey('g(hji)k', ''), false);
    scannerList.redirectBookmark(
        new BookmarkKey('e(fgh)j', ''),
        new BookmarkKey('g(hji)k', '')
    );
    scannerList.redirectBookmark(
        new BookmarkKey('g(hji)k', ''),
        new BookmarkKey('e(fgh)j', '')
    );

    expect(() => scannerList.scan('abcdefghjiklmnopqrstuvwxyz')).toThrow();
});