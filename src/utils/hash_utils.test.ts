import FileSystem from 'fs-extra';
import HashUtils from './hash_utils';

test('test path hashing is consistent', () => {
    const tmpDir1 = FileSystem.mkdtempSync('/tmp/hash_utils.testA');
    FileSystem.mkdirpSync(tmpDir1 + '/a');
    FileSystem.writeFileSync(tmpDir1 + '/a/1.txt', 'hello!');
    FileSystem.mkdirpSync(tmpDir1 + '/b');
    FileSystem.writeFileSync(tmpDir1 + '/b/2.txt', 'world!');
    const hash1 = HashUtils.md5Path(tmpDir1);

    const tmpDir2 = FileSystem.mkdtempSync('/tmp/hash_utils.testB');
    FileSystem.mkdirpSync(tmpDir2 + '/a');
    FileSystem.writeFileSync(tmpDir2 + '/a/1.txt', 'hello!');
    FileSystem.mkdirpSync(tmpDir2 + '/b');
    FileSystem.writeFileSync(tmpDir2 + '/b/2.txt', 'world!');
    const hash2 = HashUtils.md5Path(tmpDir2);

    expect(hash1).toBe(hash2);
});