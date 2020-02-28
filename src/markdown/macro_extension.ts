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
import Path from 'path';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type, ExtensionContext } from "./extender_plugin";
import StateCore from 'markdown-it/lib/rules_core/state_core';
import { runMarkdownGeneratingContainer } from './container_helper';

class MacroData {
    public readonly blockDefines: Map<string, Definition> = new Map();
    public readonly inlineDefines: Map<string, Definition> = new Map();
}

class Definition {
    public readonly requiredRootPaths: ReadonlyArray<string>;
    constructor(
        public readonly containerDir: string,
        requiredRootPaths: string[]
    ) {
        this.requiredRootPaths = requiredRootPaths.slice();
    }
}

export class MacroDefineExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('define-block', Type.BLOCK),
        new TokenIdentifier('define-inline', Type.BLOCK)
    ];

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext) {
        const preambleLines = token.content.trim().split(/\r?\n/i);
        if (preambleLines.length < 2) {
            throw new Error('Macro definition requires at least 2 lines: name and container_dir, followed by paths from root folder to copy.');
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

        const requiredRootPaths = preambleLines.slice(2); // these are paths in the root markdown folder which get copied over

        const macroData: MacroData = context.shared.get('macro') || new MacroData();
        context.shared.set('macro', macroData);
        switch (token.type) {
            case 'define-block':
                if (macroData.blockDefines.has(name)) {
                    throw new Error('Macro definition name already exists as block definition: ' + name);
                }
                macroData.blockDefines.set(name, new Definition(containerDir, requiredRootPaths));
                if (context.runtimeBlockExtensions.has(name)) {
                    throw new Error('Runtime block extension already exists: ' + name);
                }
                context.runtimeBlockExtensions.set(name, macroApply)
                break;
            case 'define-inline':
                if (macroData.inlineDefines.has(name)) {
                    throw new Error('Macro definition name already exists as inline definition: ' + name);
                }
                macroData.inlineDefines.set(name, new Definition(containerDir, requiredRootPaths));
                if (context.runtimeInlineExtensions.has(name)) {
                    throw new Error('Runtime inline extension already exists: ' + name);
                }
                context.runtimeInlineExtensions.set(name, macroApply)
                break;
            default:
                throw new Error('This should never happen');
        }
    }
}

export class MacroApplyNoopExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('apply-NORENDER-SKIP', Type.BLOCK),
        new TokenIdentifier('apply-NORENDER-SKIP', Type.INLINE)
    ];

    public render(markdownIt: MarkdownIt, tokens: ReadonlyArray<Token>, tokenIdx: number, context: ExtensionContext) {
        return '';
    }
}

function macroApply(markdownIt: MarkdownIt, token: Token, context: ExtensionContext, state: StateCore) {
    const macroData: MacroData = context.shared.get('macro') || new MacroData();
    context.shared.set('macro', macroData);

    const content = token.content; // DO NOT TRIM THIS
    const name = token.type;
    const definition = (() => {
        if (token.block) {
            const dir = macroData.blockDefines.get(name);
            if (dir === undefined) {
                throw new Error('Application of block macro missing macro: ' + name);
            }
            return dir;
        } else {
            const dir = macroData.inlineDefines.get(name);
            if (dir === undefined) {
                throw new Error('Application of inline macro missing macro: ' + name);
            }
            return dir;
        }
    })();

    const inputOverrides: Map<string, string> = new Map();
    inputOverrides.set('input.data', content);

    const dirInfo = containerCheck(context.realInputPath, definition.containerDir);
    const workDir = FileSystem.mkdtempSync('/tmp/macroContainerTemp');
    FileSystem.mkdirpSync(workDir);
    const outputDir = Path.resolve(workDir, 'output');
    FileSystem.mkdirpSync(outputDir);
    const inputDir = (() => {
        if (definition.requiredRootPaths.length > 0) {
            const tempInputDir = Path.resolve(workDir, 'input');
            FileSystem.mkdirpSync(tempInputDir);
            FileSystem.copySync(dirInfo.inputDir, tempInputDir); // copy original inputs folder to new inputs folder
            copyPaths(context.realInputPath, definition.requiredRootPaths, tempInputDir); // copy requested files from root markdown input folder to new inputs folder
            return tempInputDir;
        } else {
            return dirInfo.inputDir;
        }
    })();

    const mdOutput = runMarkdownGeneratingContainer(
        name,
        dirInfo.setupDir,
        inputDir,
        inputOverrides,
        outputDir,
        [],
        context
    );

    FileSystem.removeSync(workDir);

    const newTokens: Token[] = [];
    if (token.block) {
        state.md.block.parse(mdOutput, state.md, state.env, newTokens);
    } else {
        state.md.inline.parse(mdOutput, state.md, state.env, newTokens);
    }

    // Remove token original token and replace it with generated tokens. If no tokens were generated, DO NOT REMOVE ORIGINAL token -- you can't reduce the number below the original number of tokens because it'll
    // screw up the extender plugin (the plugin that calls this chunk of code). Instead set the token to a no-op (will not render).
    if (newTokens.length === 0) {
        token.type = 'apply-NORENDER-SKIP';
    } else {
        state.tokens.pop();
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

function copyPaths(srcBase: string, paths: ReadonlyArray<string>, dstBase: string) {
    srcBase = Path.normalize(Path.resolve(srcBase));
    dstBase = Path.normalize(Path.resolve(dstBase));
    for (const path of paths) {
        const src = Path.resolve(srcBase, path).normalize();

        const relPath = Path.relative(srcBase, src);
        if (relPath.startsWith('..')) {
            throw new Error(`Cannot inject from outside root markdown directory: ${srcBase} vs ${src}`);
        }
        
        const dst = Path.resolve(dstBase, relPath);
        const dstDir = Path.dirname(dst);
        if (dst == dstBase) {
            console.warn(`Injecting root markdown directory (this is almost always incorrect -- do you have blank or '.' in your list of files?)`);
        }
        if (FileSystem.existsSync(dst)) {
            console.log(`Original destination exists -- overwriting existing: ${relPath} (${src} to ${dst})`);
        }
        FileSystem.mkdirpSync(dstDir);
        FileSystem.copySync(src, dst);
    }
}