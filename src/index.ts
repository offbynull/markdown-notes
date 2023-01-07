/**
 * MarkdownNotes
 * Copyright (c) Kasra Faghihi, All rights reserved.
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.0 of the License, or (at your option) any later version.
 * 
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library.
 */

import * as BrowserSync from 'browser-sync';

import FileSystem from 'fs-extra';
import Process from 'process';
import { StringDecoder } from 'string_decoder';
import Colors from 'colors/safe';
import ChildProcess from 'child_process';
import { killProcessHierarchy } from './utils/process_utils';
import { isGitInstalled } from './utils/git_utils';
import { recursiveReadDir } from './utils/file_utils';
import { resolve } from 'path';

process.on('warning', e => console.warn(e.stack));

const path = (() => { 
    let path = process.argv[2];
    if (path === undefined) {
        console.error('Missing work directory argument');
        process.exit(1);
    }
    while (path.length > 1 && path.endsWith('/') === true) { // trim off trailing slashes because they screw up file watching
        path = path.slice(0, -1);
    }
    return path;
})();
const inputPath = path + '/input';
const outputPath = path + '/output';
const localCachePath = path + '/cache';

if (FileSystem.existsSync(path) === false) {
    FileSystem.mkdirSync(path);
    FileSystem.writeFileSync(path + '/README.md', 'Input markdown and resources under input path.\nOutput HTML generated under output path.\n\nGenerated by [MarkdownNotes](https://github.com/offbynull/markdown-notes).')
}

if (FileSystem.existsSync(inputPath) === false) {
    FileSystem.mkdirSync(inputPath);
    FileSystem.writeFileSync(inputPath + '/input.md', '# Fill me in')
}

if (FileSystem.existsSync(outputPath) === false) {
    FileSystem.mkdirSync(outputPath);
}

if (isGitInstalled(inputPath)) {
    console.log(Colors.yellow('GIT DETECTED: ') + 'Paths under the input directory that are ignored by git will be ignored by the render.');
}

//
// Start the server
//
const bs = BrowserSync.create();
const inputWatcher = bs.watch(
    inputPath + '/**/*',
    {
        awaitWriteFinish: {
            stabilityThreshold: 100 // Wait until file size remains constant before converting md -> html
        }
    }
);

function logOutput(prefix: string, data: Buffer, state: { decoder: StringDecoder, partialLine: string }) {
    const strSegment = state.decoder.write(data);
    state.partialLine += strSegment;
    while (true) {
        const idx = state.partialLine.indexOf('\n');
        if (idx == -1) {
            break;
        }
        const line = state.partialLine.substring(0, idx);
        console.log(prefix + ": " + line);
        state.partialLine = state.partialLine.substring(idx + 1);
    }
}


// FileSystem.removeSync(outputPath);
FileSystem.mkdirpSync(outputPath);
FileSystem.writeFileSync(outputPath + '/output.html', '<html><head></head><body><p>Awaiting initial render...</p></body></html>');

let activeChildTmpDir: undefined | string;
let activeChildProc: undefined | ChildProcess.ChildProcess;
let activeChildExitMarker = { flag: false };
inputWatcher.on('change', () => {
    if (activeChildProc !== undefined && activeChildProc.connected) {
        console.log('Render process killed (' + activeChildProc.pid + ')');
        killProcessHierarchy('' + activeChildProc.pid);
        activeChildProc.kill('SIGKILL');
        activeChildExitMarker.flag = true;
    }

    if (activeChildTmpDir !== undefined) {
        FileSystem.removeSync(activeChildTmpDir);
    }

    activeChildTmpDir = FileSystem.mkdtempSync('/tmp/render');
    const activeChildTmpWorkDir = resolve(activeChildTmpDir, 'work');
    const activeChildTmpOutputDir = resolve(activeChildTmpDir, 'output');
    const activeChildTmpRenderCacheDir = resolve(activeChildTmpDir, 'localcache');
    FileSystem.mkdirpSync(activeChildTmpWorkDir)
    FileSystem.mkdirpSync(activeChildTmpOutputDir)
    activeChildProc = ChildProcess.fork(
        'dist/render',
        [ localCachePath, inputPath, activeChildTmpOutputDir, activeChildTmpRenderCacheDir, activeChildTmpWorkDir ],  
        { silent: true } // 'silent' allows reading in stdout/stderr
    );
    const exitMarker = { flag: false };
    activeChildExitMarker = exitMarker;
    console.log('Render process started (' + activeChildProc.pid + ')');
     
    const stdoutState = { decoder: new StringDecoder(), partialLine: '' };
    const stderrState = { decoder: new StringDecoder(), partialLine: '' };
    if (activeChildProc.stdout !== null) {
        activeChildProc.stdout.on('data', (data) => {
            if (exitMarker.flag === true) {
                return;
            }
            logOutput(Colors.blue('OUT'), data, stdoutState);
        });
    }
    if (activeChildProc.stderr !== null) {
        activeChildProc.stderr.on('data', (data) => {
            if (exitMarker.flag === true) {
                return;
            }
            logOutput(Colors.red('ERR'), data, stderrState);
        });
    }
    activeChildProc.on('close', (code) => {
        if (exitMarker.flag === true) {
            return;
        }
        switch (code) {
            case 0:
                FileSystem.removeSync(outputPath);
                FileSystem.renameSync(activeChildTmpOutputDir, outputPath);
                FileSystem.removeSync(localCachePath);
                FileSystem.renameSync(activeChildTmpRenderCacheDir, localCachePath);
                console.log('Render completed.');
                break;
            default:
                console.log(Colors.bgRed('Render error: ' + code + ' exit code.'));
                break;
        }
        bs.reload('output.html');
        exitMarker.flag = true;
    })
});
bs.init({
    server: outputPath,
    watch: true,
    watchOptions: {
        awaitWriteFinish: {
            stabilityThreshold: 100 // Wait until file size remains constant before reloading browser
        }
    },
    startPath: 'output.html',
    injectChanges: false,
    // ghostMode: false,
    reloadDelay: 0, // no point in artificially waiting before reloading?
    reloadOnRestart: true,
    // WORKAROUND FOR BUG -- https://github.com/BrowserSync/browser-sync/issues/1038
    // The embedded mathjax script has a <body> tag in it which triggers this bug. This same bug exists in competing tools (e.g.
    // live-server).
    snippetOptions: {
        rule: {
            match: /$/i,
            fn: (snippet, match) => snippet + match
        }
    }
});
inputWatcher.emit('change'); // Trigger fake change to replace the placeholder with real data and reload


//
// Kill all child processes on cleanup -- https://stackoverflow.com/a/49392671
//
['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException', 'SIGTERM'].forEach(eventType => {
    Process.on(eventType as any, (...args) => {
        console.log(`Performing cleanup (${eventType})...`);
        console.log(` (args: ${args})`);
        if (activeChildProc !== undefined) {
            killProcessHierarchy('' + activeChildProc.pid);
            activeChildProc.kill('SIGKILL');
        }
        Process.exit(1);
    });
});