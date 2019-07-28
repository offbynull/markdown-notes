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

const CONTAINER_NAME = 'conda';

export class CondaExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('conda', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const condaCode = token.content;

        CondaExtension.initializeConda(context.realCachePath);

        const condaCodeHash = Crypto.createHash('md5').update(condaCode).digest('hex');
        const condaDataDir = Path.resolve(context.realCachePath, 'conda', condaCodeHash);

        FileSystem.mkdirpSync(condaDataDir);
        let condaOutputFile = (() => {
            const entries = FileSystem.readdirSync(condaDataDir);
            if (entries.length === 0) {
                return undefined;
            } else if (entries.length === 1) {
                return Path.resolve(condaDataDir, entries[0]);
            }

            const fullEntries = JSON.stringify(
                entries.map(e => Path.resolve(condaDataDir, e))
            );
            throw new Error('Too many cached files detected ' + fullEntries);
        })();


        if (condaOutputFile === undefined) {
            const splitCode = condaCode.split(/^----$/gm);
            if (splitCode.length !== 2) {
                throw new Error('Needs to split into exactly 2 segments, but split to ' + splitCode.length);
            }

            const outputFile = CondaExtension.launchConda(context.realCachePath, splitCode[0], splitCode[1]);

            const outputFileName = Path.basename(outputFile);
            const dstFile = Path.resolve(condaDataDir, outputFileName);

            FileSystem.mkdirpSync(condaDataDir);
            FileSystem.copyFileSync(outputFile, dstFile);

            condaOutputFile = dstFile;
        }


        if (condaOutputFile.toLowerCase().endsWith('.txt')) {
            const data = FileSystem.readFileSync(condaOutputFile, { encoding: 'utf8' });
            return `<pre>${markdownIt.utils.escapeHtml(data)}</pre>`;
        } else if (condaOutputFile.toLowerCase().endsWith('.svg')
            || condaOutputFile.toLowerCase().endsWith('.png')
            || condaOutputFile.toLowerCase().endsWith('.gif')
            || condaOutputFile.toLowerCase().endsWith('.jpg')
            || condaOutputFile.toLowerCase().endsWith('.jpeg')) {
            const imageHtmlPath = context.injectFile(condaOutputFile);
            return `<p><img src="${markdownIt.utils.escapeHtml(imageHtmlPath)}" alt="Generated image" /></p>`;
        } else {
            FileSystem.removeSync(condaDataDir);
            throw new Error('Generated python output file contains unknown extension: ' + condaOutputFile.length + ' outputs\n');
        }
    }





    private static initializeConda(cacheDir: string) {
        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');
        if (Buildah.existsContainer(envDir, CONTAINER_NAME)) {
            return;
        }

        console.log('Initializing Miniconda container (may take several minutes)');

        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            envDir,
            CONTAINER_NAME,
            'FROM continuumio/miniconda3:4.6.14\n',
            [], // loc of files req for dockerscript above -- e.g, specify [ '../resources/plantuml.1.2019.7.jar' ] and add 'COPY plantuml.1.2019.7.jar /opt/\n' in dockerfile above
        );
    }
    
    private static launchConda(cacheDir: string, environmentYaml: string, code: string) {
        console.log('Launching Miniconda container');

        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');

        const condaEnvNameOverride = Crypto.createHash('md5').update(environmentYaml).digest('hex');

        const tmpPath = FileSystem.mkdtempSync('/tmp/data');
        const inputPath = Path.resolve(tmpPath, 'input');
        const outputPath = Path.resolve(tmpPath, 'output');
        FileSystem.mkdirpSync(inputPath);
        FileSystem.mkdirpSync(outputPath);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'environment.yml'), environmentYaml);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'code.py'), code);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'script.sh'),
            `
            conda env create -f /input/environment.yml -n ${condaEnvNameOverride} --force
            conda run -n ${condaEnvNameOverride} python /input/code.py
            `
        );

        Buildah.launchContainer(envDir, CONTAINER_NAME, inputPath, outputPath, ['bash', '/input/script.sh']);

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