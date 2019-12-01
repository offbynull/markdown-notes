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

export class PlantUmlExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('plantuml', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const input = token.content;

        const workDir = FileSystem.mkdtempSync('/tmp/plantumlWorkDir');
        const containerDir = Path.resolve(workDir, 'container');
        const inputDir = Path.resolve(workDir, 'input');
        const outputDir = Path.resolve(workDir, 'output');

        FileSystem.mkdirpSync(containerDir);
        FileSystem.mkdirpSync(inputDir);
        FileSystem.mkdirpSync(outputDir);

        FileSystem.writeFileSync(
            Path.resolve(containerDir, 'Dockerfile'),
            'FROM alpine:3.10\n'
            + 'RUN apk add --no-cache openjdk11-jre\n'          // jre-headless won't work -- it fails when running plantuml (regardless of if the -Djava.awt.headless=true is present)
            + 'RUN apk add --no-cache fontconfig ttf-dejavu\n'  // without these packages, plantuml fails with font related exception
            + 'RUN apk add --no-cache graphviz\n'               // without these packages, plantuml fails on some graphs (dot required)
            + 'RUN apk add --no-cache wget\n'                   // install temporarily so we can download plantuml
            + 'RUN mkdir -p /opt\n'
            + 'WORKDIR /opt\n'
            + 'RUN wget https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2019.8/plantuml-1.2019.8.jar\n'
            + 'RUN apk del --no-cache wget\n'
        );

        const envHash = Crypto.createHash('md5').update(input).digest('hex');
        const containerWorkDir = Path.resolve('/tmp', envHash)
        FileSystem.writeFileSync(Path.resolve(inputDir, 'diagram.puml'), input);
        FileSystem.writeFileSync(Path.resolve(inputDir, 'run.sh'),
            `
            rm -rf ${containerWorkDir}
            mkdir -p ${containerWorkDir}
            cp /input/diagram.puml ${containerWorkDir} 
            cd ${containerWorkDir} && java -Djava.awt.headless=true -jar /opt/plantuml-1.2019.8.jar -tsvg diagram.puml
            mv ${containerWorkDir}/diagram.svg /output
            rm -rf ${containerWorkDir}
            `
        );

        const ret = runSingleOutputGeneratingContainer(
            'plantuml',
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