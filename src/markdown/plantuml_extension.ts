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

import FileSystem from 'fs';
import ChildProcess from 'child_process';
import Crypto from 'crypto';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type } from "./extender_plugin";

export class PlantUmlExtension implements Extension {
    public constructor() {
        try {
            ChildProcess.execSync('dot -V', { stdio: 'ignore' });
        } catch (err) {
            throw 'GraphViz check failed -- is it installed?\n\n' + JSON.stringify(err);
        }

        try {
            ChildProcess.execSync('java --version', { stdio: 'ignore' });
        } catch (err) {
            throw 'Java check failed -- is it installed?\n\n' + JSON.stringify(err);
        }
    }

    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('plantuml', Type.BLOCK),
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const token = tokens[tokenIdx];
        const pumlCode = token.content;

        const pumlCodeHash = Crypto.createHash('md5').update(pumlCode).digest('hex');

        const pumlDataDir = `.cache/puml/${pumlCodeHash}`;
        const pumlInputFile = pumlDataDir + '/diagram.puml';
        const pumlOutputFile = pumlDataDir + '/diagram.svg';

        FileSystem.mkdirSync(pumlDataDir, { recursive: true });
        FileSystem.writeFileSync(pumlInputFile, pumlCode, { encoding: 'utf-8' });

        ChildProcess.execSync('java -jar resources/plantuml.1.2019.7.jar -tsvg ' + pumlInputFile);

        return `<img src="${markdownIt.utils.escapeHtml(pumlOutputFile)}" alt="PlantUML Diagram" />`;
    }
}