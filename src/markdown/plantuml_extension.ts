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

const CONTAINER_PATH = './.cache/containers/plantuml.tar.gz';

export class PlantUmlExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('plantuml', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const pumlCode = token.content;

        PlantUmlExtension.initializePlantUml();

        const pumlCodeHash = Crypto.createHash('md5').update(pumlCode).digest('hex');
        const pumlDataDir = context.realCachePath + `/puml/${pumlCodeHash}`;
        const pumlOutputFile = pumlDataDir + '/diagram.svg';

        if (FileSystem.existsSync(pumlOutputFile) === false) { // only generate if not already exists
            const svgData = PlantUmlExtension.launchPlantUml(pumlCode);
            FileSystem.mkdirpSync(pumlDataDir);
            FileSystem.writeFileSync(pumlOutputFile, svgData);
        }

        const pumpOutputHtmlPath = context.injectFile(pumlOutputFile);
        return `<p><img src="${markdownIt.utils.escapeHtml(pumpOutputHtmlPath)}" alt="PlantUML Diagram" /></p>`;
    }





    private static initializePlantUml() {
        const envFile = CONTAINER_PATH;
        if (FileSystem.existsSync(envFile) === true) {
            return;
        }

        console.log('Initializing PlantUML container');

        const envDir = Path.dirname(envFile);
        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            'FROM alpine:3.10\n'
            + 'RUN apk add --no-cache openjdk11-jre\n'          // jre-headless won't work -- it fails when running plantuml (regardless of if the -Djava.awt.headless=true is present)
            + 'RUN apk add --no-cache fontconfig ttf-dejavu\n'  // without these packages, plantuml fails with font related exception
            + 'RUN apk add --no-cache graphviz\n'               // without these packages, plantuml fails on some graphs (dot required)
            + 'RUN apk add --no-cache wget\n'                   // install temporarily so we can download plantuml
            + 'RUN mkdir -p /opt\n'
            + 'WORKDIR /opt\n'
            + 'RUN wget https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2019.8/plantuml-1.2019.8.jar\n'
            + 'RUN apk del --no-cache wget\n',
            [], // files req for dockerscript above -- e.g, specify [ 'resources/plantuml.1.2019.7.jar' ] and add 'COPY plantuml.1.2019.7.jar /opt/\n' in dockerfile above
            'container',
            envFile
        );
    }
    
    private static launchPlantUml(codeInput: string) {
        console.log('Launching PlantUML container');

        const tmpPath = FileSystem.mkdtempSync('/tmp/launchcontainer');
        FileSystem.mkdirpSync(tmpPath + '/input');
        FileSystem.mkdirpSync(tmpPath + '/output');
        FileSystem.writeFileSync(tmpPath + '/input/diagram.puml', codeInput);
        FileSystem.writeFileSync(tmpPath + '/input/script.sh',
            'java -Djava.awt.headless=true -jar /opt/plantuml-1.2019.8.jar -tsvg /data/input/diagram.puml\n'
            + 'mv /data/input/diagram.svg /data/output\n'
        );
    
        Buildah.launchContainer(CONTAINER_PATH, 'container', tmpPath + '/input', tmpPath + '/output', ['sh', '/data/input/script.sh']);
        const svgOutput = FileSystem.readFileSync(tmpPath + '/output/diagram.svg', { encoding: 'utf8' });
        
        return svgOutput;
    }
}