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

const CONTAINER_PATH = './.cache/containers/dot.tar.gz';

export class DotExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('dot', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const dotCode = token.content;

        DotExtension.initializeDot();

        const dotCodeHash = Crypto.createHash('md5').update(dotCode).digest('hex');
        const dotDataDir = context.realCachePath + `/dot/${dotCodeHash}`;
        const dotOutputFile = dotDataDir + '/diagram.svg';

        if (FileSystem.existsSync(dotOutputFile) === false) { // only generate if not already exists
            const svgData = DotExtension.launchDot(dotCode);
            FileSystem.mkdirpSync(dotDataDir);
            FileSystem.writeFileSync(dotOutputFile, svgData);
        }

        const dotOutputHtmlPath = context.injectFile(dotOutputFile);
        return `<p><img src="${markdownIt.utils.escapeHtml(dotOutputHtmlPath)}" alt="Graphviz Dot Diagram" /></p>`;
    }




    private static initializeDot() {
        const envFile = CONTAINER_PATH;
        if (FileSystem.existsSync(envFile) === true) {
            return;
        }

        console.log('Initializing Dot container');

        const envDir = Path.dirname(envFile);
        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            'FROM alpine:3.10\n'
            + 'RUN apk add --no-cache graphviz\n'
            + 'RUN mkdir -p /opt\n',
            [], // files req for dockerscript above (if any), will get copied to dockerfile folder before running
            'container',
            envFile
        );
    }
    
    private static launchDot(codeInput: string) {
        console.log('Launching Dot container');

        const tmpPath = FileSystem.mkdtempSync('/tmp/launchcontainer');
        FileSystem.mkdirpSync(tmpPath + '/input');
        FileSystem.mkdirpSync(tmpPath + '/output');
        FileSystem.writeFileSync(tmpPath + '/input/diagram.dot', codeInput);
        FileSystem.writeFileSync(tmpPath + '/input/script.sh',
            'dot -Tsvg /data/input/diagram.dot > /data/output/diagram.svg\n'
        );
    
        Buildah.launchContainer(CONTAINER_PATH, 'container', tmpPath + '/input', tmpPath + '/output', ['sh', '/data/input/script.sh']);
        const svgOutput = FileSystem.readFileSync(tmpPath + '/output/diagram.svg', { encoding: 'utf8' });
        
        return svgOutput;
    }
}