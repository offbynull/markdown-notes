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

import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { Extension, TokenIdentifier, Type } from "./extender_plugin";

// import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

const instance = Module(); // create only once -- if not, node will warn about memory leaks if too many get created

export class DotExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('dot', Type.BLOCK)
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        // The following code had to be ripped out of viz.js's internals because the only public interfaces viz.js
        // exposes are those that return Promises. Even though the promise it returns is resolved immediately (upon
        // creation), it's impossible to grab the value out of the promise -- there's no other way to get a non-async
        // interface to viz.js
        const data = tokens[tokenIdx].content;
        const output = render(instance, data,
            {
                format: 'svg',
                engine: 'dot',
                files: [],
                images: [],
                yInvert: false,
                nop: 0
            }
        );

        return output;
    }
}