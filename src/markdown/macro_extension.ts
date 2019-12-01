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
import StateCore from 'markdown-it/lib/rules_core/state_core';
import { runMarkdownGeneratingContainer } from './container_helper';

class MacroData {
    public readonly blockDefines: Map<string, string> = new Map();  // name to containerdir
    public readonly inlineDefines: Map<string, string> = new Map(); // name to containerdir
}

export class MacroDefineExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('define-block', Type.BLOCK),
        new TokenIdentifier('define-inline', Type.BLOCK)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext) {
        const preambleLines = token.content.split(/\r?\n/i, 2);
        if (preambleLines.length < 2) {
            throw new Error('Macro definition requires 2 lines: name and container_dir.');
        }

        const name = preambleLines[0].trim();
        if (name === undefined) {
            throw new Error('Macro definition name missing');
        }
        if (/^[a-z0-9]+$/i.test(name) === false) {
            throw new Error('Macro definition name must contain 1 or more alphanumeric characters: ' + name)
        }

        const containerDir = preambleLines[1];
        if (name === undefined) {
            throw new Error('Macro definition container dir missing for macro: ' + name);
        }
        containerCheck(context.realInputPath, containerDir);

        const macroData: MacroData = context.shared.get('macro') || new MacroData();
        context.shared.set('macro', macroData);
        switch (token.type) {
            case 'define-block':
                if (macroData.blockDefines.has(name)) {
                    throw new Error('Macro definition name already exists as block definition: ' + name);
                }
                macroData.blockDefines.set(name, containerDir);
                break;
            case 'define-inline':
                if (macroData.inlineDefines.has(name)) {
                    throw new Error('Macro definition name already exists as inline definition: ' + name);
                }
                macroData.inlineDefines.set(name, containerDir);
                break;
            default:
                throw new Error('This should never happen');
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
                const input = content.substring(lines[0].length).trim();
                const dir = macroData.blockDefines.get(name);
                if (dir === undefined) {
                    throw new Error('Application of block macro missing macro: ' + name);
                }
                return {
                    name: name,
                    containerDir: dir,
                    input: input
                }
            } else {
                const matches = content.match(/^[a-z0-9]+/i);
                if (matches === null || matches.length !== 1) {
                    throw new Error('Application of macro missing name (first word)');
                }
                const name = matches[0];
                const input = content.substring(name.length).trim();
                const dir = macroData.inlineDefines.get(name);
                if (dir === undefined) {
                    throw new Error('Application of inline macro missing macro: ' + name);
                }
                return {
                    name: name,
                    containerDir: dir,
                    input: input
                }
            }
        })();

        const inputOverrides: Map<string, string> = new Map();
        inputOverrides.set('input.data', data.input);

        const dirInfo = containerCheck(context.realInputPath, data.containerDir);
        const outputDir = FileSystem.mkdtempSync('/tmp/macroContainerOutput');

        const mdOutput = runMarkdownGeneratingContainer(
            'macro-' + data.name,
            dirInfo.setupDir,
            dirInfo.inputDir,
            inputOverrides,
            outputDir,
            [
                new Buildah.LaunchVolumeMapping(context.realInputPath, '/files', 'r')
            ],
            context
        );

        FileSystem.removeSync(outputDir);
        
        const newTokens: Token[] = [];
        if (token.block) {
            state.md.block.parse(mdOutput, state.md, state.env, newTokens);
        } else {
            state.md.inline.parse(mdOutput, state.md, state.env, newTokens);
        }
        newTokens.forEach(t => state.tokens.push(t));
    }
}

function containerCheck(parentDir: string, dir: string) {
    if (dir.length === 0) {
        throw new Error('Path cannot be empty');
    }
    dir = Path.resolve(parentDir, dir);

    const containerSetupDir = Path.resolve(dir, 'container');
    const containerInputDir = Path.resolve(dir, 'input');
    const containerRunnerScript = Path.resolve(containerInputDir, 'run.sh');
    if (!FileSystem.existsSync(dir) || !FileSystem.lstatSync(dir).isDirectory()) {
        throw new Error(`Macro dir missing: ${dir}`);
    }
    if (!FileSystem.existsSync(containerSetupDir) || !FileSystem.lstatSync(containerSetupDir).isDirectory()) {
        throw new Error(`Macro container setup dir missing: ${containerSetupDir}`);
    }
    if (!FileSystem.existsSync(containerInputDir) || !FileSystem.lstatSync(containerInputDir).isDirectory()) {
        throw new Error(`Macro input dir missing: ${containerInputDir}`);
    }
    if (!FileSystem.existsSync(containerRunnerScript) || !FileSystem.lstatSync(containerRunnerScript).isFile()) {
        throw new Error(`Macro run script missing: ${containerRunnerScript}`);
    }
    return {
        setupDir: containerSetupDir,
        inputDir: containerInputDir,
        inputRunnerScript: containerRunnerScript
    }
}