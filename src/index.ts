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

import Markdown from './markdown/markdown';
import * as WebResourceInliner from 'web-resource-inliner';
import * as FileSystem from 'fs';


process.on('warning', e => console.warn(e.stack));

//
// Start the server
//
const bs = BrowserSync.create();
const inputWatcher = bs.watch(
    'input/**/*',
    {
        awaitWriteFinish: {
            stabilityThreshold: 100 // Wait until file size remains constant before converting md -> html
        }
    }
);
inputWatcher.on('change', () => {
    const inputFileSize = FileSystem.statSync('input/input.md').size;
    const inputBuffer = FileSystem.readFileSync('input/input.md', null);

    // Render input.md to output.html
    const input = inputBuffer.toString('utf8');
    const output = new Markdown().render(input);
    
    const config: WebResourceInliner.Options = {
        'fileContent': output,
        'images': true,
        'links': true,
        'scripts': true,
        'svgs': true,
        'strict': true
    };
    WebResourceInliner.html(
        config,
        (error, result) => {
            if (error) {
                console.error(error);
                return;
            }
            const outputBuffer = Buffer.from(result, 'utf8');
            FileSystem.writeFileSync('output/output.html', outputBuffer.toString('utf8'));
            const outputFileSize = FileSystem.statSync('output/output.html').size;
            
            console.log('input_filesize:' + inputFileSize
                + ' input_readsize:' + inputBuffer.byteLength
                + ' output_writesize: ' + outputBuffer.byteLength
                + ' output_filesize: ' + outputFileSize);
            bs.reload('output.html');                                  // ask the browser to reload
        }
    );
});

// Create a fake output if one does not exist, just so there's something initially to load when we start
FileSystem.writeFileSync('output/output.html', '<html><head></head><body></body></html>');
bs.init({
    server: './output',
    watch: true,
    watchOptions: {
        awaitWriteFinish: {
            stabilityThreshold: 100 // Wait until file size remains constant before reloading browser
        }
    },
    startPath: 'output.html',
    // injectChanges: false,
    // ghostMode: false,
    reloadDelay: 500,
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