import FileSystem from 'fs-extra';
import Crypto from 'crypto';
import Path from 'path';

module HashUtils {
    export function md5(data: string | Buffer) {
        return Crypto.createHash('md5').update(data).digest('hex');
    }

    export function md5Array(data: string[]) {
        const hasher = Crypto.createHash('md5');
        hasher.update(data.length.toString());
        for (const elem of data) {
            hasher.update(elem);
        }
        return hasher.digest('hex');
    }

    export function md5Path(path: string) {
        const hasher = Crypto.createHash('md5');
        internalHashFiles(path, [ path ], hasher);
        return hasher.digest('hex');
    }

    function internalHashFiles(rootPath: string, paths: string[], hasher: Crypto.Hash) {
        for (const path of paths) {
            if (FileSystem.statSync(path).isDirectory() === true) {
                const childPaths = FileSystem.readdirSync(path).map(p => Path.resolve(path, p));
                internalHashFiles(rootPath, childPaths, hasher);
            } else {
                const relativePath = Path.relative(rootPath, path);
                hasher.update(relativePath.length.toString());
                hasher.update(relativePath);

                const data = FileSystem.readFileSync(path);
                hasher.update(data.length.toString());
                hasher.update(data);
            }
        }
    }
}

export = HashUtils;