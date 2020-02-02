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

        let lang = '';
        let fileIsolateRegex = /^(.*)$/s;
        let fileStripRegex = /^$/gs;
        let output = '';
        for (let line of lines) {
            const langDecl = SET_LANG_DECL.exec(line);
            if (langDecl !== null) {
                lang = langDecl[1].trim();
                continue;
            }

            const setFileIsolateDecl = SET_FILE_ISOLATE_DECL.exec(line);
            if (setFileIsolateDecl !== null) {
                fileIsolateRegex = new RegExp(setFileIsolateDecl[1], 's');
                continue;
            }

            const setFileStripDecl = SET_FILE_STRIP_DECL.exec(line);
            if (setFileStripDecl !== null) {
                fileStripRegex = new RegExp(setFileStripDecl[1], 'gs');
                continue;
            }

            const fileDecl = FILE_DECL.exec(line);
            if (fileDecl !== null) {
                const path = Path.resolve(context.realInputPath, fileDecl[1]);
                if (Path.relative(context.realInputPath, path).startsWith('..')) {
                    throw new Error(`Cannot inject outside of input directory: ${path}`);
                }

                let data = FileSystem.readFileSync(path, 'UTF-8');
                
                const isolation = fileIsolateRegex.exec(data);
                if (isolation === null) {
                    throw new Error(`Isolation regex ${fileIsolateRegex} does not match file data ${path}`);
                }
                data = isolation[1];

                data = data.replace(fileStripRegex, '');
                fileStripRegex.lastIndex = 0; // this has the g flag set, so it needs to be reset
                
                if (!data.endsWith('\n')) {
                    data += '\n';
                }

                output += HighlightJs.getLanguage(lang) ? HighlightJs.highlight(lang, data).value : escapeHTML(data);
                continue;
            }

            const writeDecl = WRITE_DECL.exec(line);
            if (writeDecl !== null) {
                output += HighlightJs.getLanguage(lang) ? HighlightJs.highlight(lang, writeDecl[1]).value : escapeHTML(writeDecl[1]);
                output += '\n';
                continue;
            }

            throw new Error('Unrecognized command: ' + line)
        }

        return `<pre class="hljs"><code>${output}</code></pre>`;
    }
}