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

import FileSystem from 'fs';
import ChildProcess from 'child_process';
import Crypto from 'crypto';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type } from "./extender_plugin";

export class DotExtension implements Extension {
    public constructor() {
        try {
            ChildProcess.execSync('dot -V', { stdio: 'ignore' });
        } catch (err) {
            throw 'GraphViz check failed -- is it installed?\n\n' + JSON.stringify(err);
        }
    }

    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('dot', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const token = tokens[tokenIdx];
        const dotCode = token.content;

        const dotCodeHash = Crypto.createHash('md5').update(dotCode).digest('hex');

        const dotDataDir = `.cache/dot/${dotCodeHash}`;
        const dotInputFile = dotDataDir + '/diagram.dot';
        const dotOutputFile = dotDataDir + '/diagram.svg';

        FileSystem.mkdirSync(dotDataDir, { recursive: true });
        FileSystem.writeFileSync(dotInputFile, dotCode, { encoding: 'utf-8' });

        ChildProcess.execSync(`dot -Tsvg ${dotInputFile} > ${dotOutputFile}`);

        return `<img src="${markdownIt.utils.escapeHtml(dotOutputFile)}" alt="Graphiv Dot Diagram" />`;
    }
}