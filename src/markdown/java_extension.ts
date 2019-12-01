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
    <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
        <modelVersion>4.0.0</modelVersion>
        <groupId>unused</groupId>
        <artifactId>unused</artifactId>
        <version>unused</version>
        
        <properties>
            <maven.compiler.source>12</maven.compiler.source>
            <maven.compiler.target>12</maven.compiler.target>
        </properties>

        <dependencies>
        </dependencies>
    </project>
    `;

export class JavaExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('maven', Type.BLOCK),
        new TokenIdentifier('java', Type.BLOCK)
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const input = token.content;

        const workDir = FileSystem.mkdtempSync('/tmp/javaWorkDir');
        const containerDir = Path.resolve(workDir, 'container');
        const inputDir = Path.resolve(workDir, 'input');
        const outputDir = Path.resolve(workDir, 'output');

        FileSystem.mkdirpSync(containerDir);
        FileSystem.mkdirpSync(inputDir);
        FileSystem.mkdirpSync(outputDir);

        FileSystem.writeFileSync(Path.resolve(containerDir, 'Dockerfile'), 'FROM maven:3.6.1-jdk-12\n');

        const splitCode = (() => {
            const split = input.split(/^----$/gm);
            switch (split.length) {
                case 1:
                    return { packageJson: DEFAULT_PACKAGE_JSON, javaCode: split[0] };
                case 2:
                    return { packageJson: split[0], javaCode: split[1] };
                default:
                    throw new Error('Split into unrecognized number of segments: ' + split.length);
            }
        })();
        FileSystem.writeFileSync(Path.resolve(inputDir, 'pom.xml'), splitCode.packageJson);
        FileSystem.writeFileSync(Path.resolve(inputDir, 'Main.java'), splitCode.javaCode);

        const envHash = Crypto.createHash('md5').update(splitCode.packageJson).digest('hex');
        const containerWorkDir = Path.resolve('/tmp', envHash)
        FileSystem.writeFileSync(Path.resolve(inputDir, 'run.sh'),
            `
            rm -rf ${containerWorkDir}
            mkdir -p ${containerWorkDir}
            mkdir -p ${containerWorkDir}/src/main/java 
            cp /input/Main.java ${containerWorkDir}/src/main/java 
            cp /input/pom.xml ${containerWorkDir}
            cd ${containerWorkDir} && mvn clean install exec:java -Dexec.mainClass="Main" 
            rm -rf ${containerWorkDir}
            `
        );

        const ret = runSingleOutputGeneratingContainer(
            'java',
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