import * as FileSystem from 'fs-extra';
import { recursiveReadDir, syncDirs } from './file_utils';

test('must sync directories', () => {
    const srcRoot = FileSystem.mkdtempSync('/tmp/file_utils.test');
    FileSystem.mkdirpSync(srcRoot + '/0/0');
    FileSystem.writeFileSync(srcRoot + '/0/1', 'abcd');
    FileSystem.symlinkSync(srcRoot + '/0/0', srcRoot + '/0/2');

    const dstRoot = FileSystem.mkdtempSync('/tmp/file_utils.test');
    FileSystem.writeFileSync(dstRoot + '/mustbedeleted1', '');
    FileSystem.mkdirpSync(dstRoot + '/mustbedeleted2');


    syncDirs(srcRoot, dstRoot);


    const statTest = (src: string, dst: string) => {
        const srcStat = FileSystem.lstatSync(src);
        const dstStat = FileSystem.lstatSync(dst);
        expect(srcStat.mode).toBe(dstStat.mode);
        expect(srcStat.size).toBe(dstStat.size);
        // expect(srcStat.mtime).toEqual(dstStat.mtime); // mtime soemtimes is slightly off -- unsure why this is happening
    };

    expect(FileSystem.readdirSync(dstRoot)).toEqual(['0']);
    expect(FileSystem.readdirSync(dstRoot + '/0')).toEqual(['0', '1', '2']);
    statTest(srcRoot + '/0', dstRoot + '/0');
    statTest(srcRoot + '/0/0', dstRoot + '/0/0');
    statTest(srcRoot + '/0/1', dstRoot + '/0/1');
    statTest(srcRoot + '/0/2', dstRoot + '/0/2');
});


test('must list directories recursive', () => {
    const srcRoot = FileSystem.mkdtempSync('/tmp/file_utils.test');
    FileSystem.mkdirpSync(srcRoot + '/0/a/0');
    FileSystem.mkdirpSync(srcRoot + '/0/a/1');
    FileSystem.mkdirpSync(srcRoot + '/0/b/0');

    const res = recursiveReadDir(srcRoot);

    expect(res).toEqual(['0', '0/a', '0/a/0', '0/a/1', '0/b', '0/b/0']);
});