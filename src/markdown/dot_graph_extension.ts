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
import { Extension, TokenIdentifier, Type, ExtensionContext } from "./extender_plugin";

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

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const dotCode = token.content;

        const dotCodeHash = Crypto.createHash('md5').update(dotCode).digest('hex');

        const dotDataDir = context.realCachePath + `/dot/${dotCodeHash}`;
        const dotInputFile = dotDataDir + '/diagram.dot';
        const dotOutputFile = dotDataDir + '/diagram.svg';

        if (FileSystem.existsSync(dotOutputFile) === false) { // only generate if not already exists
            FileSystem.mkdirSync(dotDataDir, { recursive: true });
            FileSystem.writeFileSync(dotInputFile, dotCode, { encoding: 'utf-8' });

            const ret = ChildProcess.spawnSync('dot', [ '-Tsvg', dotInputFile], { cwd: context.realInputPath });
            if (ret.status !== 0) {
                // Using default encoding for stdout and stderr because can't find a way to get actual system encoding
                throw 'Error executing dot: '
                    + JSON.stringify({
                        errorCode: ret.status,
                        stderr: ret.stderr.toString(),
                        stdout: ret.stdout.toString()
                    }, null, 2); 
            }
            FileSystem.writeFileSync(dotOutputFile, ret.stdout);
        }

        const dotOutputHtmlPath = context.injectFile(dotOutputFile);
        return `<p><img src="${markdownIt.utils.escapeHtml(dotOutputHtmlPath)}" alt="Graphviz Dot Diagram" /></p>`;
    }
}