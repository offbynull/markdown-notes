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

import FileSystem from 'fs-extra';
import Path from 'path';
import MarkdownIt from 'markdown-it';
import HighlightJs from 'highlight.js';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type, ExtensionContext } from "./extender_plugin";
import escapeHTML from 'escape-html';

const SET_LANG_DECL = /^set_lang>(.*)$/;
const SET_FILE_ISOLATE_DECL = /^set_file_isolate>(.*)$/;
const SET_FILE_STRIP_DECL = /^set_file_strip>(.*)$/;
const FILE_DECL = /^file>(.*)$/;
const WRITE_DECL = /^write>(.*)$/;

export class OutputExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('output', Type.BLOCK)
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        let content = token.content.trim();
        const lines = content.split(/[\r\n]/g);

        if (lines.length < 2) {
            throw new Error('Not enough lines. Lines should be as follows:\n'
                + ' * 1st line is the file path.\n'
                + ' * 2nd line (optional) is the language to use for highlighting syntax.\n'
                + ' * 3rd line (optional) is a regex that isolates the output to a specific portion of the file (capture group 1 is what get isolated).'
                + '\n\n'
                + 'Input was:\n\n'
                + content);
        }

        const path = Path.resolve(context.realInputPath, lines[0]);
        if (Path.relative(context.realInputPath, path).startsWith('..')) {
            throw new Error(`Cannot inject outside of input directory: ${path}`);
        }
        const lang = lines.length < 2 ? '' : lines[1];
        const regex = lines.length < 3 ? /^([\s\S]*)$/  : new RegExp(lines[2], '');

        let data = FileSystem.readFileSync(path, 'UTF-8');
                
        const isolation = regex.exec(data);
        if (isolation === null) {
            throw new Error(`Isolation regex ${regex} does not match file data ${path}`);
        }
        if (isolation[1] === undefined) {
            throw new Error(`Isolation regex ${regex} did not extract group 1 from data ${path}`);
        }
        data = isolation[1];

        const trimCount = getStartingSpaceCount(data);
        data = knockback(data, trimCount);

        const output = HighlightJs.getLanguage(lang) ? HighlightJs.highlight(lang, data).value : escapeHTML(data);

        return `<pre class="hljs"><code>${output}</code></pre>`;
    }
}


function getStartingSpaceCount(input: string) {
    let startLine = true;
    let startSpace = 0;
    const startSpaces: number[] = [];
    for (let i = 0; i < input.length; i++) {
        const element = input[i];
        if (startLine) {
            if (element === ' ') {
                startSpace += 1;
            } else if (element === '\n') {
                startSpace = 0;
            } else {
                startLine = false;
                startSpaces.push(startSpace);
            }
        } else {
            if (element === '\n') {
                startSpace = 0;
                startLine = true;
            }
        }
    }
    
    // add startSpace for last line if last line not empty
    if (startLine === false) {
      startSpaces.push(startSpace);
    }

    const minStartSpace = Math.min(...startSpaces);
    return minStartSpace === Infinity ? 0 : minStartSpace;
}

function knockback(input: string, count: number) {
    let output = '';
    let chompsRemaining = count;
    for (let i = 0; i < input.length; i++) {
        const element = input[i];
        if (element === '\n') {
            chompsRemaining = count;
            output += element;
        } else {
            if (chompsRemaining > 0) {
                chompsRemaining -= 1;
            } else {
                output += element;
            }
        }
    }
    return output;
}