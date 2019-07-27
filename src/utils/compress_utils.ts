import * as FileSystem from 'fs-extra';
import * as Tar from 'tar';

export function targzDirectory(dir: string, outputFile: string) {
    const filesToTar = FileSystem.readdirSync(dir);
    Tar.create({
        gzip: true,
        sync: true,
        cwd: dir,
        file: outputFile 
    }, filesToTar);
}

export function unTargzDirectory(dir: string, inputFile: string) {
    FileSystem.mkdirpSync(dir);
    Tar.extract({
        sync: true,
        cwd: dir,
        file: inputFile
    });
}