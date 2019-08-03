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

const CONTAINER_NAME = 'maven';

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

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        const mavenCode = token.content;

        JavaExtension.initializeMaven(context.realCachePath);

        const mavenCodeHash = Crypto.createHash('md5').update(mavenCode).digest('hex');
        const mavenDataDir = Path.resolve(context.realCachePath, 'maven', mavenCodeHash);

        FileSystem.mkdirpSync(mavenDataDir);
        let mavenOutputFile = (() => {
            const entries = FileSystem.readdirSync(mavenDataDir);
            if (entries.length === 0) {
                return undefined;
            } else if (entries.length === 1) {
                return Path.resolve(mavenDataDir, entries[0]);
            }

            const fullEntries = JSON.stringify(
                entries.map(e => Path.resolve(mavenDataDir, e))
            );
            throw new Error('Too many cached files detected ' + fullEntries);
        })();


        if (mavenOutputFile === undefined) {
            const splitCode = (() => {
                const split = mavenCode.split(/^----$/gm);
                switch (split.length) {
                    case 1:
                        return { project: DEFAULT_PACKAGE_JSON, code: split[0] };
                    case 2:
                        return { project: split[0], code: split[1] };
                    default:
                        throw new Error('Split into unrecognized number of segments: ' + split.length);
                }
            })();

            const outputFile = JavaExtension.launchMaven(context.realCachePath, context.realInputPath, splitCode.project, splitCode.code);

            const outputFileName = Path.basename(outputFile);
            const dstFile = Path.resolve(mavenDataDir, outputFileName);

            FileSystem.mkdirpSync(mavenDataDir);
            FileSystem.copyFileSync(outputFile, dstFile);

            mavenOutputFile = dstFile;
        }

        return outputFileToHtml(mavenOutputFile, markdownIt, context);
    }





    private static initializeMaven(cacheDir: string) {
        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');
        if (Buildah.existsContainer(envDir, CONTAINER_NAME)) {
            return;
        }

        console.log('Initializing Maven container (may take several minutes)');

        FileSystem.mkdirpSync(envDir);
        
        // create container
        Buildah.createContainer(
            envDir,
            CONTAINER_NAME,
            'FROM maven:3.6.1-jdk-12\n',
            [], // loc of files req for dockerscript above -- e.g, specify [ '../resources/plantuml.1.2019.7.jar' ] and add 'COPY plantuml.1.2019.7.jar /opt/\n' in dockerfile above
        );
    }
    
    private static launchMaven(cacheDir: string, realInputDir: string, pom: string, code: string) {
        console.log('Launching Maven container');

        const envDir = Path.resolve(cacheDir, CONTAINER_NAME + '_container_env');

        const tmpPath = FileSystem.mkdtempSync('/tmp/data');
        const inputPath = Path.resolve(tmpPath, 'input');
        const outputPath = Path.resolve(tmpPath, 'output');
        FileSystem.mkdirpSync(inputPath);
        FileSystem.mkdirpSync(outputPath);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'pom.xml'), pom);

        const srcPath = Path.resolve(inputPath, 'src', 'main', 'java');
        FileSystem.mkdirpSync(srcPath);
        FileSystem.writeFileSync(Path.resolve(srcPath, 'Main.java'), code);
        FileSystem.writeFileSync(Path.resolve(inputPath, 'script.sh'),
            `
            cd /input && mvn clean install exec:java -Dexec.mainClass="Main" 
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