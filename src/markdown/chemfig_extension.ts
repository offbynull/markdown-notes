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
import { runSingleOutputGeneratingContainer } from './container_helper';

export class ChemfigExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('chemfig', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const input = token.content;

        const workDir = FileSystem.mkdtempSync('/tmp/chemfigWorkDir');
        const containerDir = Path.resolve(workDir, 'container');
        const inputDir = Path.resolve(workDir, 'input');
        const outputDir = Path.resolve(workDir, 'output');

        FileSystem.mkdirpSync(containerDir);
        FileSystem.mkdirpSync(inputDir);
        FileSystem.mkdirpSync(outputDir);

        FileSystem.writeFileSync(
            Path.resolve(containerDir, 'Dockerfile'),
            'FROM ubuntu:19.04\n'
            + 'ARG DEBIAN_FRONTEND=noninteractive\n'
            + 'RUN apt -y -qq update && apt-get -y -qq install texlive-base texlive-latex-extra\n'
            + 'RUN rm -rf /var/lib/apt/lists/*'
        );

        const inputFull = '\\documentclass{standalone}\n\\usepackage{chemfig}\n\\begin{document}\n' + input + `\\end{document}`
        const envHash = Crypto.createHash('md5').update(input).digest('hex');
        const containerWorkDir = Path.resolve('/tmp', envHash)
        FileSystem.writeFileSync(Path.resolve(inputDir, 'input.tex'), inputFull);
        FileSystem.writeFileSync(Path.resolve(inputDir, 'run.sh'),
            `
            rm -rf ${containerWorkDir}
            mkdir -p ${containerWorkDir}
            cp /input/input.tex ${containerWorkDir}
            cd ${containerWorkDir} && latex input.tex && dvisvgm input.dvi
            mv input.svg /output/diagram.svg
            rm -rf ${containerWorkDir}
            `
        );

        const ret = runSingleOutputGeneratingContainer(
            'chemfig',
            containerDir,
            inputDir,
            new Map(),
            outputDir,
            [
                new Buildah.LaunchVolumeMapping(context.realInputPath, '/files', 'r')
            ],
            context
        );

        FileSystem.removeSync(workDir);
        return ret;
    }
}