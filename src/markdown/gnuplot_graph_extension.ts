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
import Crypto from 'crypto';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type, ExtensionContext } from "./extender_plugin";
import * as Buildah from '../buildah/buildah';
import { targzDirectory } from '../utils/compress_utils';

const CONTAINER_NAME = 'gnuplot';

export class GnuPlotExtension implements Extension {
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
                    throw 'GnuPlot extension only allows SVG terminal output';
                }
                foundSvgTerminal = true;
            }

            const outputMatch = gnuplotCodeLine.match(/^set\s+output\s+.*$/gi);
            if (outputMatch !== null) {
                throw 'GnuPlot extension does not allow explicitly setting output';
            }
        }

        if (foundSvgTerminal === false) {
            throw 'GnuPlot extension requires: set terminal svg ...';
        }

        // TODO: Scan script for CSVs used (https://stackoverflow.com/questions/48885697/gnuplot-graph-csv),
        //         copy those CSVs into container for launch,
        //         and add CSV hashes to gnuplotCodeHash

        GnuPlotExtension.initializeGnuPlot(context.realCachePath);

        const gnuplotCodeHash = Crypto.createHash('md5').update(gnuplotCode).digest('hex');
        const gnuplotDataDir = context.realCachePath + `/gnuplot/${gnuplotCodeHash}`;
        const gnuplotOutputFile = gnuplotDataDir + '/plot.svg';

        if (FileSystem.existsSync(gnuplotOutputFile) === false) { // only generate if not already exists
            const svgData = GnuPlotExtension.launchGnuPlot(context.realCachePath, gnuplotCode);
            FileSystem.mkdirpSync(gnuplotDataDir);
            FileSystem.writeFileSync(gnuplotOutputFile, svgData);
        }

        const gnuplotOutputHtmlPath = context.injectFile(gnuplotOutputFile);
        return `<p><img src="${markdownIt.utils.escapeHtml(gnuplotOutputHtmlPath)}" alt="GnuPlot plot" /></p>`;
    }




    private static initializeGnuPlot(cacheDir: string) {
        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');
        if (Buildah.existsContainer(envDir, CONTAINER_NAME)) {
            return;
        }

        console.log('Initializing GnuPlot container');

        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            envDir,
            CONTAINER_NAME,
            'FROM alpine:3.10\n'
            + 'RUN apk add --no-cache gnuplot\n'
            + 'RUN mkdir -p /opt\n',
            [] // files req for dockerscript above (if any), will get copied to dockerfile folder before running
        );


        // backup container
        const backupFile = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env_initial.tar.gz');
        targzDirectory(envDir, backupFile);
    }
    
    private static launchGnuPlot(cacheDir: string, codeInput: string) {
        console.log('Launching GnuPlot container');

        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');

        const tmpPath = FileSystem.mkdtempSync('/tmp/data');
        FileSystem.mkdirpSync(tmpPath + '/input');
        FileSystem.mkdirpSync(tmpPath + '/output');
        FileSystem.writeFileSync(tmpPath + '/input/plot.plt', codeInput);
        FileSystem.writeFileSync(tmpPath + '/input/script.sh',
            'gnuplot /input/plot.plt > /output/plot.svg\n'
        );
    
        Buildah.launchContainer(envDir, CONTAINER_NAME, tmpPath + '/input', tmpPath + '/output', ['sh', '/input/script.sh']);
        const svgOutput = FileSystem.readFileSync(tmpPath + '/output/plot.svg', { encoding: 'utf8' });
        
        return svgOutput;
    }
}