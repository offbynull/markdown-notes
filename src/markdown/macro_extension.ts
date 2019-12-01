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
import StateCore from 'markdown-it/lib/rules_core/state_core';
import StateBlock from 'markdown-it/lib/rules_block/state_block';

const CONTAINER_NAME = 'macro';

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

class MacroData {
    public readonly blockDefines: Map<string, string> = new Map();
    public readonly inlineDefines: Map<string, string> = new Map();
}

export class MacroDefineExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('define-block', Type.BLOCK),
        new TokenIdentifier('define-inline', Type.BLOCK)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext) {
        const lines = token.content.split(/\r?\n/i, 1);
        if (lines.length < 1) {
            throw new Error('Macro definition requires at least 1 line: name.');
        }

        const name = lines[0].trim();
        if (/^[a-z0-9]+$/i.test(name) === false) {
            throw new Error('Name must contain 1 or more alphanumeric characters: ' + name)
        } 

        const macroData: MacroData = context.shared.get('macro') || new MacroData();
        context.shared.set('macro', macroData);

        const macroCode = token.content.substring(lines[0].length).trim();
        switch (token.type) {
            case 'define-block':
                if (macroData.blockDefines.has(name)) {
                    throw new Error('Name already exists as macro block definition: ' + name);
                }
                macroData.blockDefines.set(name, macroCode);
                break;
            case 'define-inline':
                if (macroData.inlineDefines.has(name)) {
                    throw new Error('Name already exists as macro inline definition: ' + name);
                }
                macroData.inlineDefines.set(name, macroCode);
                break;
            default:
                throw new Error('Macro definition type must be set to either inline or block: ' + token.type);
        }
    }
}

export class MacroApplyExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('apply', Type.BLOCK),
        new TokenIdentifier('apply', Type.INLINE)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext, state: StateCore) {
        const macroData: MacroData = context.shared.get('macro') || new MacroData();
        context.shared.set('macro', macroData);

        const content = token.content.trim();

        const data = (() => {
            if (token.block) {
                const lines = content.split(/\r?\n/i, 1);
                if (lines.length < 1) {
                    throw new Error('Application of block macro missing name (first line).');
                }
                const matches = lines[0].match(/^[a-z0-9]+/i);
                if (matches === null || matches.length !== 1) {
                    throw new Error('Application of block macro missing name (first word of first line)');
                }
                const name = matches[0];
                const input = content.substring(lines[0].length);
                const code = macroData.blockDefines.get(name);
                if (code === undefined) {
                    throw new Error('Application of block macro missing macro: ' + name);
                }
                return {
                    code: code,
                    input: input
                }
            } else {
                const matches = content.match(/^[a-z0-9]+/i);
                if (matches === null || matches.length !== 1) {
                    throw new Error('Application of macro missing name (first word)');
                }
                const name = matches[0];
                const input = content.substring(name.length);
                const code = macroData.inlineDefines.get(name);
                if (code === undefined) {
                    throw new Error('Application of inline macro missing macro: ' + name);
                }
                return {
                    code: code,
                    input: input
                }
            }
        })();

        MacroApplyExtension.initializeNode(context.realCachePath);

        const dataStr = JSON.stringify(data);

        const nodeCodeHash = Crypto.createHash('md5').update(dataStr).digest('hex');
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
                const split = data.code.split(/^----$/gm);
                switch (split.length) {
                    case 1:
                        return { project: DEFAULT_PACKAGE_JSON, code: split[0] };
                    case 2:
                        return { project: split[0], code: split[1] };
                    default:
                        throw new Error('Split into unrecognized number of segments: ' + split.length);
                }
            })();

            const outputFile = MacroApplyExtension.launchNode(context.realCachePath, context.realInputPath, splitCode.project, data.input, splitCode.code);

            const outputFileName = Path.basename(outputFile);
            const dstFile = Path.resolve(nodeDataDir, outputFileName);

            FileSystem.mkdirpSync(nodeDataDir);
            FileSystem.copyFileSync(outputFile, dstFile);

            nodeOutputFile = dstFile;
        }


        const output = FileSystem.readFileSync(nodeOutputFile, { encoding: 'utf8' });
        
        const newTokens: Token[] = [];
        if (token.block) {
            state.md.block.parse(output, state.md, state.env, newTokens);
        } else {
            state.md.inline.parse(output, state.md, state.env, newTokens);
        }

        newTokens.forEach(t => state.tokens.push(t));
    }





    private static initializeNode(cacheDir: string) {
        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');
        if (Buildah.existsContainer(envDir, CONTAINER_NAME)) {
            return;
        }

        console.log('Initializing Macro container (may take several minutes)');

        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            envDir,
            CONTAINER_NAME,
            'FROM node:8.16-buster\n',
            [], // loc of files req for dockerscript above -- e.g, specify [ '../resources/plantuml.1.2019.7.jar' ] and add 'COPY plantuml.1.2019.7.jar /opt/\n' in dockerfile above
        );
    }
    
    private static launchNode(cacheDir: string, realInputDir: string, packageJson: string, input: string, code: string) {
        console.log('Launching Macro container');

        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');

        const containerWorkDir = Path.resolve('opt', Crypto.createHash('md5').update(packageJson).digest('hex'));

        const tmpPath = FileSystem.mkdtempSync('/tmp/data');
        const inputPath = Path.resolve(tmpPath, 'input');
        const outputPath = Path.resolve(tmpPath, 'output');
        FileSystem.mkdirpSync(inputPath);
        FileSystem.mkdirpSync(outputPath);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'package.json'), packageJson);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'code.js'), code);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'input.txt'), input);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'script.sh'),
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
        if (outputFiles[0] !== 'output.txt') {
            throw new Error('Require exactly 1 output named output.txt');
        }
        const outputFile = Path.resolve(outputPath, outputFiles[0]);
        
        return outputFile;
    }
}