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
import { runMarkdownGeneratingContainer } from './container_helper';
import { MacroDefinition, MacroType, macroDirectoryCheck } from './macro_helper';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import StateInline from 'markdown-it/lib/rules_inline/state_inline';
import StateBlock from 'markdown-it/lib/rules_block/state_block';
import { JSDOM } from 'jsdom';

export class CustomMacroExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier>;
    private readonly definition: MacroDefinition;

    public constructor(definition: MacroDefinition) {
        this.tokenIds = (() => {
            switch (definition.type) {
                case MacroType.BLOCK:
                    return [ new TokenIdentifier(definition.name, Type.BLOCK) ];
                case MacroType.INLINE:
                    return [ new TokenIdentifier(definition.name, Type.INLINE) ];
                case MacroType.ALL:
                    return [
                        new TokenIdentifier(definition.name, Type.BLOCK),
                        new TokenIdentifier(definition.name, Type.INLINE)
                    ];
                default:
                    throw Error('This should never happen');
            }
        })();
        this.definition = definition;
    }

    public process(markdownIt: MarkdownIt, token: Token, context: ExtensionContext, state: StateInline | StateBlock): void {
        const definition = this.definition;
        const name = token.type;
        const data = (() => {
            const prefix = this.definition.inputOverridePathsPrefix;
            const raw = token.content; // DO NOT TRIM THIS
            const files = new Set<string>(definition.inputOverridePaths);
            let content = '';
            if (prefix !== undefined) {
                const lines = raw.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith(prefix)) {
                        const path = line.slice(prefix.length);
                        files.add(path);
                    } else {
                        content = lines.slice(i).join('\n');
                        break;
                    }
                }
                return {
                    inputCopyPaths: files,
                    content: content
                }
            } else {
                return {
                    inputCopyPaths: new Set<string>(),
                    content: raw
                };
            }
        })();

        
        if (data.inputCopyPaths.has('input.data') || data.inputCopyPaths.has('input.files')) {
            throw Error(`Macro ${name} is trying to copy input.data and/or input.files as an input but those files are internally reserved and can't be overridden`);
        }
    
        const inputOverrides: Map<string, string> = new Map();
        inputOverrides.set('input.data', data.content);
        inputOverrides.set('input.files', [...data.inputCopyPaths].join('\n'));
    
        const dirInfo = macroDirectoryCheck(context.realInputPath, definition.directory);
        const workDir = FileSystem.mkdtempSync('/tmp/macroContainerTemp');
        FileSystem.mkdirpSync(workDir);
        const outputDir = Path.resolve(workDir, 'output');
        FileSystem.mkdirpSync(outputDir);
        const inputDir = (() => {
            if (data.inputCopyPaths.size > 0) {
                const tempInputDir = Path.resolve(workDir, 'input');
                FileSystem.mkdirpSync(tempInputDir);
                FileSystem.copySync(dirInfo.containerInputDir, tempInputDir); // copy original inputs folder to new inputs folder
                copyPaths(context.realInputPath, [...data.inputCopyPaths], tempInputDir); // copy requested files from root markdown input folder to new inputs folder
                return tempInputDir;
            } else {
                return dirInfo.containerInputDir;
            }
        })();
    
        const mdOutput = runMarkdownGeneratingContainer(
            name,
            dirInfo.containerSetupDir,
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
            throw Error('No tokens generated by custom macro: ' + name);
        } else {
            state.tokens.pop();
            newTokens.forEach(t => state.tokens.push(t));
        }
    }

    public postHtml(dom: JSDOM, context: ExtensionContext): JSDOM {
        const document = dom.window.document;
    
        const headElement = document.getElementsByTagName('head')[0];
        for (const k in this.definition.inputInjectScriptPaths) {
            const scriptHtmlBasePath = k;
            const scriptType = this.definition.inputInjectScriptPaths[k];

            switch (scriptType) {
                case 'js':
                    const scriptElem = document.createElement('script');
                    scriptElem.setAttribute('src', scriptHtmlBasePath);
                    headElement.appendChild(scriptElem);
                    break;
                case 'css':
                    const linkElem = document.createElement('link');
                    linkElem.setAttribute('href', scriptHtmlBasePath);
                    linkElem.setAttribute('rel', 'stylesheet');
                    headElement.appendChild(linkElem);
                    break;
                default:
                    throw new Error('This should never happen');
            }
        }

        return dom;
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