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

const DEFAULT_PACKAGE_JSON =
    `
    {
        "scripts": {
        "start": "node code.js"
        },
        "dependencies": {
        },
        "devDependencies": {
        }
    }
    `;

export class NodeExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('node', Type.BLOCK)
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const input = token.content;

        const workDir = FileSystem.mkdtempSync('/tmp/nodeWorkDir');
        const containerDir = Path.resolve(workDir, 'container');
        const inputDir = Path.resolve(workDir, 'input');
        const outputDir = Path.resolve(workDir, 'output');

        FileSystem.mkdirpSync(containerDir);
        FileSystem.mkdirpSync(inputDir);
        FileSystem.mkdirpSync(outputDir);

        FileSystem.writeFileSync(Path.resolve(containerDir, 'Dockerfile'), 'FROM node:8.16-buster\n');

        const splitCode = (() => {
            const split = input.split(/^----$/gm);
            switch (split.length) {
                case 1:
                    return { packageJson: DEFAULT_PACKAGE_JSON, nodeCode: split[0] };
                case 2:
                    return { packageJson: split[0], nodeCode: split[1] };
                default:
                    throw new Error('Split into unrecognized number of segments: ' + split.length);
            }
        })();
        FileSystem.writeFileSync(Path.resolve(inputDir, 'package.json'), splitCode.packageJson);
        FileSystem.writeFileSync(Path.resolve(inputDir, 'code.js'), splitCode.nodeCode);

        const envHash = Crypto.createHash('md5').update(splitCode.packageJson).digest('hex');
        const containerWorkDir = Path.resolve('/tmp', envHash)
        FileSystem.writeFileSync(Path.resolve(inputDir, 'run.sh'),
            `
            rm -rf ${containerWorkDir}
            mkdir -p ${containerWorkDir} 
            rm ${containerWorkDir}/package.json
            rm ${containerWorkDir}/code.js
            cp /input/package.json ${containerWorkDir} 
            cp /input/code.js ${containerWorkDir}
            cd ${containerWorkDir} && npm install && npm start
            rm -rf ${containerWorkDir}
            `
        );

        const ret = runSingleOutputGeneratingContainer(
            'node',
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