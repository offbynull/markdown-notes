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
import { outputFileToHtml } from './output_utils';

const CONTAINER_NAME = 'node';

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

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const nodeCode = token.content;

        NodeExtension.initializeNode(context.realCachePath);

        const nodeCodeHash = Crypto.createHash('md5').update(nodeCode).digest('hex');
        const nodeDataDir = Path.resolve(context.realCachePath, 'node', nodeCodeHash);

        FileSystem.mkdirpSync(nodeDataDir);
        let nodeOutputFile = (() => {
            const entries = FileSystem.readdirSync(nodeDataDir);
            if (entries.length === 0) {
                return undefined;
            } else if (entries.length === 1) {
                return Path.resolve(nodeDataDir, entries[0]);
            }

            const fullEntries = JSON.stringify(
                entries.map(e => Path.resolve(nodeDataDir, e))
            );
            throw new Error('Too many cached files detected ' + fullEntries);
        })();


        if (nodeOutputFile === undefined) {
            const splitCode = (() => {
                const split = nodeCode.split(/^----$/gm);
                switch (split.length) {
                    case 1:
                        return { project: DEFAULT_PACKAGE_JSON, code: split[0] };
                    case 2:
                        return { project: split[0], code: split[1] };
                    default:
                        throw new Error('Split into unrecognized number of segments: ' + split.length);
                }
            })();

            const outputFile = NodeExtension.launchNode(context.realCachePath, context.realInputPath, splitCode.project, splitCode.code);

            const outputFileName = Path.basename(outputFile);
            const dstFile = Path.resolve(nodeDataDir, outputFileName);

            FileSystem.mkdirpSync(nodeDataDir);
            FileSystem.copyFileSync(outputFile, dstFile);

            nodeOutputFile = dstFile;
        }


        return outputFileToHtml(nodeOutputFile, markdownIt, context);
    }





    private static initializeNode(cacheDir: string) {
        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');
        if (Buildah.existsContainer(envDir, CONTAINER_NAME)) {
            return;
        }

        console.log('Initializing Node container (may take several minutes)');

        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            envDir,
            CONTAINER_NAME,
            'FROM node:8.16-buster\n',
            [], // loc of files req for dockerscript above -- e.g, specify [ '../resources/plantuml.1.2019.7.jar' ] and add 'COPY plantuml.1.2019.7.jar /opt/\n' in dockerfile above
        );
    }
    
    private static launchNode(cacheDir: string, realInputDir: string, packageJson: string, code: string) {
        console.log('Launching Node container');

        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');

        const containerWorkDir = Path.resolve('opt', Crypto.createHash('md5').update(packageJson).digest('hex'));

        const tmpPath = FileSystem.mkdtempSync('/tmp/data');
        const inputPath = Path.resolve(tmpPath, 'input');
        const outputPath = Path.resolve(tmpPath, 'output');
        FileSystem.mkdirpSync(inputPath);
        FileSystem.mkdirpSync(outputPath);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'package.json'), packageJson);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'code.js'), code);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'script.sh'),
            `
            mkdir -p ${containerWorkDir} 
            rm ${containerWorkDir}/package.json
            rm ${containerWorkDir}/code.js
            cp /input/package.json ${containerWorkDir} 
            cp /input/code.js ${containerWorkDir}
            cd ${containerWorkDir} && npm install && npm start
            `
        );

        Buildah.launchContainer(envDir, CONTAINER_NAME, ['bash', '/input/script.sh'],
        {
            volumeMappings: [
                new Buildah.LaunchVolumeMapping(inputPath, '/input', 'rw'),
                new Buildah.LaunchVolumeMapping(outputPath, '/output', 'rw'),
                new Buildah.LaunchVolumeMapping(realInputDir, '/files', 'r')
            ]
        });

        const outputFiles = FileSystem.readdirSync(outputPath);
        if (outputFiles.length !== 1) {
            throw new Error(
                'Require exactly 1 output, but was ' + outputFiles.length + ' outputs\n'
                + '-----\n'
                + JSON.stringify(outputFiles) + '\n'
                + '-----\n'
                + code
            );
        }
        const outputFile = Path.resolve(outputPath, outputFiles[0]);
        
        return outputFile;
    }
}