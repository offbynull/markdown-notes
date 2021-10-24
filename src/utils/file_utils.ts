import * as FileSystem from 'fs-extra';
import * as Path from 'path';
import * as Tar from 'tar';
import { isGitInstalled, listTrackedIgnoredFiles, listUntrackedIgnoredFiles } from './git_utils';

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
    internalRecursiveReadDir(dir, '', output, 0);
    return output
}

function internalRecursiveReadDir(rootDir: string, relDir: string, output: string[], level: number) {
    const absDir = Path.resolve(rootDir, relDir);
    const children = FileSystem.readdirSync(absDir);
    for (const child of children) {
        const relChild = level === 0 ? child : (relDir + '/' + child);
        const absChild = Path.resolve(rootDir, './' + relChild);
        const stats = FileSystem.lstatSync(absChild);
        output.push(relChild);
        if (stats.isDirectory()) {
            internalRecursiveReadDir(rootDir, relChild, output, level + 1);
        }
    }
};

export function gitRespectingCopySync(
    src: string,
    dst: string,
    options?: FileSystem.CopyOptionsSync,
    emptyDirSkipNotifier?: (path: string) => void,
    gitTrackedIgnoreSeenNotifier?: (path: string) => void,
    gitUntrackedIgnoreSkipNotifier?: (path: string) => void
) {
    if (isGitInstalled(src)) {
        listTrackedIgnoredFiles(src).forEach(p => gitTrackedIgnoreSeenNotifier && gitTrackedIgnoreSeenNotifier(p));
        const untrackedIgnoreFiles = new Set(listUntrackedIgnoredFiles(src));
        const oldOptFilter = options?.filter || (() => true);
        const newOptFilter = (src: string, dst: string) => {
            if (FileSystem.lstatSync(src).isDirectory()) {
                const srcChildren = new Set(recursiveReadDir(src).map(p => src + '/' + p));
                for (const ignoredFile of untrackedIgnoreFiles) {
                    srcChildren.delete(ignoredFile);
                }
                if (srcChildren.size === 0) {
                    emptyDirSkipNotifier && emptyDirSkipNotifier(src);
                    return false; // empty dirs aren't stored in git, don't include them
                }
            }
            if (untrackedIgnoreFiles.has(src)) {
                gitUntrackedIgnoreSkipNotifier && gitUntrackedIgnoreSkipNotifier(src);
                return false;
            }
            return oldOptFilter(src, dst);
        };
        if (options !== undefined) {
            options.filter = newOptFilter;
        } else {
            options = { filter: newOptFilter };
        }
    }
    FileSystem.copySync(src, dst, options);
}

export function recursiveCheckForMissingOrMismatched(srcDir: string, dstDir: string) {
    const badPaths = [];
    const children = recursiveReadDir(srcDir);
    const srcPaths = children.map(p => Path.resolve(srcDir, p));
    const dstPaths = children.map(p => Path.resolve(dstDir, p));
    for (let i = 0; i < children.length; i++) {
        if (!FileSystem.existsSync(dstPaths[i])) {
            badPaths.push(dstPaths[i]);
            continue;
        }
        const srcLstat = FileSystem.lstatSync(srcPaths[i]);
        const dstLstat = FileSystem.lstatSync(dstPaths[i]);
        if (srcLstat.isDirectory() && dstLstat.isDirectory()) {
            continue; // ok -- both dir
        }
        if (srcLstat.isFile() && dstLstat.isFile() && srcLstat.size === dstLstat.size && FileSystem.readFileSync(srcPaths[i]).equals(FileSystem.readFileSync(dstPaths[i]))) {
            continue; // ok -- both match
        }
        badPaths.push(dstPaths[i]);
    }
    return badPaths;
}

export function forceAllChildrenToDestination(srcDir: string, dstDir: string) {
    const children = FileSystem.readdirSync(srcDir);
    const srcPaths = children.map(p => Path.resolve(srcDir, p));
    const dstPaths = children.map(p => Path.resolve(dstDir, p));
    for (let i = 0; i < children.length; i++) {
        if (FileSystem.existsSync(dstPaths[i])) {
            FileSystem.removeSync(dstPaths[i]);
        }
        FileSystem.copySync(srcPaths[i], dstPaths[i]);
    }
}