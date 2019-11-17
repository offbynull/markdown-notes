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
import Crypto from 'crypto';
import Path from 'path';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type, ExtensionContext } from "./extender_plugin";
import * as Buildah from '../buildah/buildah';

const CONTAINER_NAME = 'chemfig';

export class ChemfigExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('chemfig', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const chemfigCode = token.content;

        ChemfigExtension.initializeChemfig(context.realCachePath);

        const chemfigCodeHash = Crypto.createHash('md5').update(chemfigCode).digest('hex');
        const chemfigDataDir = context.realCachePath + `/chemfig/${chemfigCodeHash}`;
        const chemfigOutputFile = chemfigDataDir + '/diagram.svg';

        if (FileSystem.existsSync(chemfigOutputFile) === false) { // only generate if not already exists
            const chemfigCodeFull = '\\documentclass{standalone}\n\\usepackage{chemfig}\n\\begin{document}\n' + chemfigCode + `\\end{document}`;
            const svgData = ChemfigExtension.launchChemfig(context.realCachePath, context.realInputPath, chemfigCodeFull);
            FileSystem.mkdirpSync(chemfigDataDir);
            FileSystem.writeFileSync(chemfigOutputFile, svgData);
        }

        const chemfigOutputHtmlPath = context.injectFile(chemfigOutputFile);
        return `<p><img src="${markdownIt.utils.escapeHtml(chemfigOutputHtmlPath)}" alt="LaTeX Chemfig Diagram" /></p>`;
    }




    private static initializeChemfig(cacheDir: string) {
        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');
        if (Buildah.existsContainer(envDir, CONTAINER_NAME)) {
            return;
        }

        console.log('Initializing Chemfig container');

        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            envDir,
            CONTAINER_NAME,
            'FROM ubuntu:19.04\n'
            + 'ARG DEBIAN_FRONTEND=noninteractive\n'
            + 'RUN apt -y -qq update && apt-get -y -qq install texlive-base texlive-latex-extra\n'
            + 'RUN rm -rf /var/lib/apt/lists/*',
            []  // files req for dockerscript above (if any), will get copied to dockerfile folder before running
        );
    }
    
    private static launchChemfig(cacheDir: string, realInputDir: string, codeInput: string) {
        console.log('Launching Chemfig container');

        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');

        const tmpPath = FileSystem.mkdtempSync('/tmp/data');
        FileSystem.mkdirpSync(tmpPath + '/input');
        FileSystem.mkdirpSync(tmpPath + '/output');
        FileSystem.writeFileSync(tmpPath + '/input/input.tex', codeInput);
        FileSystem.writeFileSync(tmpPath + '/input/script.sh',
            'cd /input\n'
            + 'latex input.tex\n'
            + 'dvisvgm input.dvi\n'
            + 'mv input.svg /output/diagram.svg\n'
        );
    
        Buildah.launchContainer(envDir, CONTAINER_NAME, ['sh', '/input/script.sh'],
            {
                volumeMappings: [
                    new Buildah.LaunchVolumeMapping(tmpPath + '/input', '/input', 'rw'),
                    new Buildah.LaunchVolumeMapping(tmpPath + '/output', '/output', 'rw'),
                    new Buildah.LaunchVolumeMapping(realInputDir, '/files', 'r')
                ]
            });
        const svgOutput = FileSystem.readFileSync(tmpPath + '/output/diagram.svg', { encoding: 'utf8' });
        
        return svgOutput;
    }
}