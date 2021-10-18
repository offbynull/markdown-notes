import { spawnSync } from "child_process";
import { resolve } from 'path';

export function isGitInstalled(dir: string): boolean {
    const ret = spawnSync(`which`, [`git`], { cwd: dir, encoding: 'utf8' });
    if (ret.status === 1) {
        return false;
    } else if (ret.status === 0) {
        return true;
    } else {
        throw `Unable to determine if git installed: ${ret}`;
    }
}

export function getGitRoot(dir: string): string | null {
    const ret = spawnSync(`git`, [`rev-parse`, `--git-dir`], { cwd: dir, encoding: 'utf8' });
    if (ret.status !== 0 && ret.stderr.includes('not a gitdir')) {
        return null;
    }
    if (ret.status !== 0) {
        throw `git returned error: ${ret}`;
    }
    const foundPath = ret.stdout.replace(/[\r\n]/g, '');
    return resolve(dir, foundPath);
}

export function listTrackedIgnoredFiles(dir: string): string[] {
    const ret = spawnSync(`git`, [`ls-files`, `-i`, `--exclude-standard`], { cwd: dir, encoding: 'utf8' });
    if (ret.status !== 0) {
        throw `git returned error: ${ret}`;
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
        throw `git returned error: ${ret}`;
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
        throw `git returned error: ${ret}`;
    }
    const out = ret.stdout.replace(/(\r?\n)+$/, '')  // chomp any trailing newlines
    if (out.length == 0) {
        return [];
    } else {
        return out.split(/\r?\n/).map(p => resolve(dir, p));
    }
}
