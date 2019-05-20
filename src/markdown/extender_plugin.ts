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

import MarkdownIt, { RuleBlock, RuleInline } from 'markdown-it';
import Token from 'markdown-it/lib/token';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import { JSDOM } from 'jsdom';

export enum Type {
    BLOCK = 'block',
    INLINE = 'inline'
}

const NAME_REGEX = /^[A-Za-z0-9_\-]+$/;
const NAME_EXTRACT_REGEX = /^\s*\{([A-Za-z0-9_\-]*)\}\s*/;

export class TokenIdentifier {
    public readonly name: string;
    public readonly type: Type;

    public constructor(name: string, type: Type) {
        if (!name.match(NAME_REGEX)) {
            throw "Key must only contain " + NAME_REGEX + ": " + name;
        }

        this.name = name;
        this.type = type;
    }
}

export interface Extension {
    readonly tokenIds: ReadonlyArray<TokenIdentifier>;
    process?: (markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>) => void;
    postProcess?: (markdownIt: MarkdownIt, tokens: Token[], context: Map<string, any>) => void;
    render?: (markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>) => string;
    postHtml?: (dom: JSDOM, context: Map<string, any>) => JSDOM;
}

export class NameEntry {
    public readonly block: Extension | undefined;
    public readonly inline: Extension | undefined;

    public constructor(block: Extension | undefined, inline: Extension | undefined) {
        this.block = block;
        this.inline = inline;
    }

    public updateBlockExtension(block: Extension): NameEntry {
        return new NameEntry(block, this.inline);
    } 

    public updateInlineExtension(inline: Extension): NameEntry {
        return new NameEntry(this.block, inline);
    } 
}

export class ExtenderConfig {
    private readonly exts: Extension[];
    private readonly nameLookup: Map<string, NameEntry>;

    public constructor() {
        this.exts = [];
        this.nameLookup = new Map();
    }

    public register(extension: Extension): void {
        for (const tId of extension.tokenIds) {
            let obj = this.nameLookup.get(tId.name);
            if (obj === undefined) {
                obj = new NameEntry(undefined, undefined);
            }
            
            switch (tId.type) {
                case Type.BLOCK:
                    if (obj.block !== undefined) {
                        extension.tokenIds.forEach(tIdToRemove => this.nameLookup.delete(tIdToRemove.name)); // remove any added
                        throw 'Block already exists: ' + tId.name;
                    }
                    obj = obj.updateBlockExtension(extension);
                    break;
                case Type.INLINE:
                    if (obj.inline !== undefined) {
                        extension.tokenIds.forEach(tIdToRemove => this.nameLookup.delete(tIdToRemove.name)); // remove any added
                        throw 'Inline already exists: ' + tId.name;
                    }
                    obj = obj.updateInlineExtension(extension);
                    break;
                default:
                    throw 'Unrecognized type';
            }

            this.nameLookup.set(tId.name, obj);
        }


        this.exts.push(extension);
    }

    public get(name: string) {
        return this.nameLookup.get(name);
    }

    public names(): string[] {
        return Array.from(this.nameLookup.keys());
    }

    public extensions(): Extension[] {
        return Array.from(this.exts);
    }
}

function findRule<S extends StateCore>(markdownIt: MarkdownIt, name: string, rules: MarkdownIt.Rule<S>[]): MarkdownIt.Rule<S> {
    let ret: MarkdownIt.Rule<S> | undefined;
    for (const rule of rules) {
        if (rule.name === name) {
            ret = rule;
            break;
        }
    }
    if (ret === undefined) {
        throw name + ' rule not found';
    }
    return ret;
}

function invokePostProcessors(extenderConfig: ExtenderConfig, markdownIt: MarkdownIt, tokens: Token[], context: Map<string, any>): void {
    for (const extension of extenderConfig.extensions()) {
        if (extension.postProcess !== undefined) {
            extension.postProcess(markdownIt, tokens, context);
        }
    }
}

function invokePostHtmls(extenderConfig: ExtenderConfig, dom: JSDOM, context: Map<string, any>): JSDOM {
    for (const extension of extenderConfig.extensions()) {
        if (extension.postHtml !== undefined) {
            const newDom = extension.postHtml(dom, context);
            if (newDom !== undefined) {
                dom = newDom;
            }
        }
    }
    return dom;
}

function addRenderersToMarkdown(extenderConfig: ExtenderConfig, markdownIt: MarkdownIt, context: Map<string, any>) {
    for (const name of extenderConfig.names()) {
        const obj = extenderConfig.get(name);
        if (obj === undefined) {
            throw 'Should never be undefined';
        }
        markdownIt.renderer.rules[name] = function(tokens, idx): string {
            const token = tokens[idx];
            if (token.block === true && obj.block !== undefined && obj.block.render !== undefined) {
                return obj.block.render(markdownIt, tokens, idx, context);
            } else if (token.block === false && obj.inline !== undefined && obj.inline.render !== undefined) {
                return obj.inline.render(markdownIt, tokens, idx, context);
            }
            return '';
        }
    }
}

export function extender(markdownIt: MarkdownIt, extenderConfig: ExtenderConfig): void {
    const context: Map<string, any> = new Map(); // simple map for sharing data between invocations


    // Augment block fence rule to call the extension processor with the matching name.
    const blockRules = markdownIt.block.ruler.getRules('');
    const oldFenceRule = findRule(markdownIt, 'fence', blockRules);
    // @ts-ignore the typedef for RuleBlock is incorrect
    const newFenceRule: RuleBlock = function(state, startLine, endLine, silent): boolean | void {
        const beforeTokenLen = state.tokens.length;
        // @ts-ignore the typedef for RuleBlock is incorrect
        let ret = oldFenceRule(state, startLine, endLine, silent);
        if (ret !== true) {
            return ret;
        }
        const afterTokenLen = state.tokens.length;
        
        if (afterTokenLen !== beforeTokenLen + 1) {
            throw 'Unexpected number of tokens';
        }

        const tokenIdx = beforeTokenLen;
        const token = state.tokens[tokenIdx];
        const infoMatch = token.info.match(NAME_EXTRACT_REGEX);
        if (infoMatch !== null && infoMatch.length === 2) { //infoMatch[0] is the whole thing, infoMatch[1] is the group
            const info = infoMatch[1];
            const extensionEntries = extenderConfig.get(info);
            if (info.length === 0) { // if empty id, remove it and fallback to normal
                const skipLen = infoMatch[0].length;
                token.info = token.info.slice(skipLen);
            } else if (extensionEntries !== undefined && extensionEntries.block !== undefined) { // if id is expected, keep it
                token.type = info;
                token.info = '';
                token.tag = '';
                if (extensionEntries.block.process !== undefined) { // call if handler is a function
                    extensionEntries.block.process(markdownIt, state.tokens, tokenIdx, context);
                }
            } else { // otherwise throw error
                throw 'Unidentified fence extension: ' + info;
            }
        }

        return ret;
    }
    markdownIt.block.ruler.at('fence', newFenceRule);


    // Augment inline backticks rule to call the extension processor with the matching name.
    const inlineRules = markdownIt.inline.ruler.getRules('');
    const oldBacktickRule: RuleInline = findRule(markdownIt, 'backtick', inlineRules);
    const newBacktickRule: RuleInline = function(state, silent): boolean | void {
        const beforeTokenLen = state.tokens.length;
        let ret = oldBacktickRule(state, silent);
        if (ret !== true) {
            return ret;
        }
        const afterTokenLen = state.tokens.length;
        
        if (!(afterTokenLen > beforeTokenLen)) {
            throw 'No tokens generated';
        }

        for (let tokenIdx = beforeTokenLen; tokenIdx < afterTokenLen; tokenIdx++) {
            const token = state.tokens[tokenIdx];
            if (token.type !== 'code_inline') {
                continue;
            }
            
            const infoMatch = token.content.match(NAME_EXTRACT_REGEX);
            if (infoMatch !== null && infoMatch.length === 2) { //infoMatch[0] is the whole thing, infoMatch[1] is the group
                const skipLen = infoMatch[0].length;
                const info = infoMatch[1];
                const extensionEntries = extenderConfig.get(info);
                if (info.length === 0) { // if empty id, remove it and fallback to normal
                    token.content = token.content.slice(skipLen);
                } else if (extensionEntries !== undefined && extensionEntries.inline !== undefined) { // if id is expected, keep it
                    token.type = info;
                    token.info = '';
                    token.tag = '';
                    token.content = token.content.slice(skipLen);
                    if (extensionEntries.inline.process !== undefined) { // call if handler is a function
                        extensionEntries.inline.process(markdownIt, state.tokens, tokenIdx, context);
                    }
                } else { // otherwise throw error
                    throw 'Unidentified fence extension: ' + info;
                }
            }
        }

        return ret;
    }
    markdownIt.inline.ruler.at('backticks', newBacktickRule);


    // Augment md's parsing to call our extension post processors after executing (to go over all tokens and
    // potentially manipulate them prior to rendering)
    const oldMdParse = markdownIt.parse;
    markdownIt.parse = function(src, env): Token[] {
        const tokens = oldMdParse.apply(markdownIt, [src, env]);
        invokePostProcessors(extenderConfig, markdownIt, tokens, context);
        return tokens;
    }


    // Augment md's render output to call our extension post renderers after executing
    const oldMdRender = markdownIt.render;
    markdownIt.render = function(src, env): string {
        let html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
            <meta content="utf-8" http-equiv="encoding">
          </head>
          <body>` + oldMdRender.apply(markdownIt, [src, env]) + `</body>
        </html>`;
        
        let dom = new JSDOM(html);
        dom = invokePostHtmls(extenderConfig, dom, context);

        return dom.serialize(); // JsBeautify.html_beautify(dom.serialize());
    }


    // Augment md's renderer to call our extension custom render functions when that extension's name is encountered
    // as a token's type.
    addRenderersToMarkdown(extenderConfig, markdownIt, context);
}