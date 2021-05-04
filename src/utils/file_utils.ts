import * as FileSystem from 'fs-extra';
import * as Path from 'path';
import * as Tar from 'tar';

export function targzDir(dir: string, outputFile: string) {
    const filesToTar = FileSystem.readdirSync(dir);
    Tar.create({
        gzip: true,
        sync: true,
        cwd: dir,
        file: outputFile 
    }, filesToTar);
}

export function unTargzDir(dir: string, inputFile: string) {
    FileSystem.mkdirpSync(dir);
    Tar.extract({
        sync: true,
        cwd: dir,
        file: inputFile
    });
}

// originally written to revert containers back to original condition quickly, but too slow to use on normal disks (not SSDs, HDD)...
// works similarly to rsync with --delete arg
export function syncDirs(srcDir: string, dstDir: string) {
    internalSyncDirs(srcDir, dstDir, srcDir, dstDir);
}

function internalSyncDirs(rootSrcDir: string, rootDstDir: string, srcDir: string, dstDir: string) {
    FileSystem.mkdirpSync(dstDir);

    const srcEntries = FileSystem.readdirSync(srcDir);
    const dstEntries = FileSystem.existsSync(dstDir) && FileSystem.lstatSync(dstDir).isDirectory() ? FileSystem.readdirSync(dstDir) : [];


    for (const entry of srcEntries) {
        const srcEntry = Path.resolve(srcDir, entry);
        const dstEntry = Path.resolve(dstDir, entry);

        const srcStat = FileSystem.lstatSync(srcEntry);
        const dstStat = FileSystem.existsSync(dstEntry) ? FileSystem.lstatSync(dstEntry) : undefined;

        const replace = dstStat !== undefined && (srcStat.mtimeMs !== dstStat.mtimeMs || srcStat.size != dstStat.size || srcStat.mode !== dstStat.mode);

        if (srcStat.isDirectory()) {
            // DO NOT DELETE DSTDIR IF IT ALREADY EXISTS -- the method will sync up its contents once it recurses in
            FileSystem.mkdirSync(dstEntry);
            internalSyncDirs(rootSrcDir, rootDstDir, srcEntry, dstEntry);
        } else if (srcStat.isFile()) {
            if (replace === true) {
                FileSystem.unlinkSync(dstEntry);
            }
            FileSystem.copyFileSync(srcEntry, dstEntry);
        } else if (srcStat.isSymbolicLink()) {
            if (replace === true) {
                FileSystem.unlinkSync(dstEntry);
            }
            const srcEntryFollowed = FileSystem.readlinkSync(srcEntry);
            const dstEntryFollowed = (() => {
                if (srcEntryFollowed.indexOf(rootSrcDir) !== 0) { // following link to outside, keep as-is
                    return srcEntryFollowed;
                } else { // following link to inside, relative to destination
                    const relativeFollowed = Path.relative(rootSrcDir, srcEntryFollowed);
                    return Path.resolve(rootDstDir, relativeFollowed);
                }
            })();

            FileSystem.symlinkSync(dstEntryFollowed, dstEntry);
        } else {
            throw new Error('Unrecognized file type');
        }

        try {
            FileSystem.utimesSync(dstEntry, srcStat.atime, srcStat.mtime);
        } catch (e) {
            // ignore failures to update time -- shouldn't be a critical failure
        }
    }


    const dstEntriesToDelete = dstEntries.filter(e => srcEntries.includes(e) === false);
    for (const dstEntryToDelete of dstEntriesToDelete) {
        const dstDeletePath = Path.resolve(dstDir, dstEntryToDelete);
        FileSystem.removeSync(dstDeletePath);
    }
}

export function recursiveReadDir(dir: string): string[] {
    const output: string[] = []
    internalRecursiveReadDir(dir, dir, output);
    return output
}

function internalRecursiveReadDir(rootOutputDir: string, currOutputDir: string, output: string[]) {
    const outputDirEntries = FileSystem.readdirSync(currOutputDir);
    for (const child of outputDirEntries) {
        const absChild = Path.resolve(currOutputDir, child);
        const stats = FileSystem.lstatSync(absChild);
        output.push(child);
        if (stats.isDirectory()) {
            internalRecursiveReadDir(rootOutputDir, child, output);
        }
    }
};