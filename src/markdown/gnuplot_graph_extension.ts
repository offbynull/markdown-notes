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

export class GnuPlotExtension implements Extension {
    public constructor() {
        try {
            ChildProcess.execSync('gnuplot -V', { stdio: 'ignore' });
        } catch (err) {
            throw 'GnuPlot check failed -- is it installed?\n\n' + JSON.stringify(err);
        }
    }

    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('gnuplot', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const gnuplotCode = token.content;

        let foundSvgTerminal = false;
        const gnuplotCodeLines = gnuplotCode.split(/[\r\n]+/g);
        for (const gnuplotCodeLine of gnuplotCodeLines) {
            const terminalMatch = gnuplotCodeLine.match(/^set\s+terminal\s+(.*)$/i);
            if (terminalMatch !== null){
                const svgTerminal = terminalMatch[1].toLowerCase().startsWith('svg');
                if (svgTerminal === false) {
                    throw 'Gnuplot extension only allows SVG terminal output';
                }
                foundSvgTerminal = true;
            }

            const outputMatch = gnuplotCodeLine.match(/^set\s+output\s+.*$/gi);
            if (outputMatch !== null) {
                throw 'Gnuplot extension does not allow explicitly setting output';
            }
        }

        if (foundSvgTerminal === false) {
            throw 'Gnuplot extension requires: set terminal svg ...';
        }

        const gnuplotCodeHash = Crypto.createHash('md5').update(gnuplotCode).digest('hex');

        const gnuplotDataDir = context.realCachePath + `/gnuplot/${gnuplotCodeHash}`;
        const gnuplotInputFile = gnuplotDataDir + '/plot.plt';
        const gnuplotOutputFile = gnuplotDataDir + '/plot.svg';

        // Because gnuplot can reference files for data, there's no point trying to cache this based on the contents of the plot script
        // if (FileSystem.existsSync(gnuplotOutputFile) === false) { // only generate if not already exists
        FileSystem.mkdirSync(gnuplotDataDir, { recursive: true });
        FileSystem.writeFileSync(gnuplotInputFile, gnuplotCode, { encoding: 'utf-8' });

        const ret = ChildProcess.spawnSync('gnuplot', [ gnuplotInputFile ], { cwd: context.realInputPath });
        if (ret.status !== 0) {
            // Using default encoding for stdout and stderr because can't find a way to get actual system encoding
            throw 'Error executing dot: '
                + JSON.stringify({
                    errorCode: ret.status,
                    stderr: ret.stderr.toString(),
                    stdout: ret.stdout.toString()
                }, null, 2); 
        }
        FileSystem.writeFileSync(gnuplotOutputFile, ret.stdout);
        // }

        const gnuplotOutputHtmlPath = context.injectFile(gnuplotOutputFile);
        return `<p><img src="${markdownIt.utils.escapeHtml(gnuplotOutputHtmlPath)}" alt="Gnuplot plot" /></p>`;
    }
}