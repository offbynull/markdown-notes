import { spawnSync } from "child_process";
import { resolve } from 'path';

export function isGitInstalled(dir: string): boolean {
    const whichRet = spawnSync('which', ['git'], { cwd: dir, encoding: 'utf8' });
    if (whichRet.status === 1) {
        return false;
    }
    if (whichRet.status !== 0) {
        throw `Unable to determine if git installed: ${whichRet}`;
    }

    const repoRet = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir, encoding: 'utf8' });
    return repoRet.status === 0 && repoRet.stdout.trim() === 'true';
}

export function getGitRoot(dir: string): string | null {
    const ret = spawnSync(`git`, [`rev-parse`, `--git-dir`], { cwd: dir, encoding: 'utf8' });
    if (ret.status !== 0 && ret.stderr.includes('not a gitdir')) {
        return null;
    }
    if (ret.status !== 0) {
        throw `git returned error: \n\n${ret.stdout}\n\n${ret.stderr}`;
    }
    const foundPath = ret.stdout.replace(/[\r\n]/g, '');
    return resolve(dir, foundPath);
}

export function listTrackedIgnoredFiles(dir: string): string[] {
    const ret = spawnSync(`git`, [`ls-files`, `-i`, '-c', `--exclude-standard`], { cwd: dir, encoding: 'utf8' });
    if (ret.status !== 0) {
        throw `git returned error: \n\n${ret.stdout}\n\n${ret.stderr}`;
    }
    const out = ret.stdout.replace(/(\r?\n)+$/, '')  // chomp any trailing newlines
    if (out.length == 0) {
        return [];
    } else {
        return out.split(/\r?\n/).map(p => resolve(dir, p));
    }
}

export function listUntrackedIgnoredFiles(dir: string): string[] {
    const ret = spawnSync(`git`, [`ls-files`, `-o`, `--exclude-standard`, `--ignored`], { cwd: dir, encoding: 'utf8' });
    if (ret.status !== 0) {
        throw `git returned error: \n\n${ret.stdout}\n\n${ret.stderr}`;
    }
    const out = ret.stdout.replace(/(\r?\n)+$/, '')  // chomp any trailing newlines
    if (out.length == 0) {
        return [];
    } else {
        return out.split(/\r?\n/).map(p => resolve(dir, p));
    }
}


export function listUntrackedFiles(dir: string): string[] {
    const ret = spawnSync(`git`, [`ls-files`, `-o`], { cwd: dir, encoding: 'utf8' });
    if (ret.status !== 0) {
        throw `git returned error: \n\n${ret.stdout}\n\n${ret.stderr}`;
    }
    const out = ret.stdout.replace(/(\r?\n)+$/, '')  // chomp any trailing newlines
    if (out.length == 0) {
        return [];
    } else {
        return out.split(/\r?\n/).map(p => resolve(dir, p));
    }
}
