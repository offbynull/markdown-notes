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
import * as ImageUtils from '../utils/image_utils';

export class ImageExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('image', Type.BLOCK),
        new TokenIdentifier('img', Type.BLOCK)
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: ExtensionContext): string {
        const token = tokens[tokenIdx];
        let content = token.content.trim();
        const lines = content.split(/[\r\n]/g);

        if (lines.length < 3) {
            throw new Error('Require at least 3 lines for images: file location, alternative text, title');
        }

        const file = lines[0];
        const altText = lines[1];
        const title = lines[2]; // this is where attribution goes

        const srcPath = Path.resolve(context.realInputPath, file);
        const srcData = FileSystem.readFileSync(srcPath);

        let svgData = ImageUtils.wrapAsSvg(srcData);
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length === 0) {
                continue;
            }

            const command = (() => {
                const split = line.split(/\s+/, 2);
                if (split === undefined || split.length < 1) {
                    throw new Error('Command missing');
                }
                return split[0].toLowerCase();
            })();

            let highlightColor: string | undefined;
            let fontColor: string | undefined;
            let fontSize: number | undefined;
            let strokeSize: number | undefined
            switch (command) {
                case 'highlight_color': {
                    const params = line.split(/\s+/, 2);
                    if (params.length !== 2) {
                        throw new Error(`bad params -- highlight_color html_color_code: ${line}`);
                    }
                    highlightColor = params[1];
                    break;
                }
                case 'font_color': {
                    const params = line.split(/\s+/, 2);
                    if (params.length !== 2) {
                        throw new Error(`bad params -- font_color html_color_code: ${line}`);
                    }
                    fontColor = params[1];
                    break;
                }
                case 'font_size': {
                    const params = line.split(/\s+/, 2);
                    if (params.length !== 2) {
                        throw new Error(`bad params -- font_size size: ${line}`);
                    }
                    const newFontSize = parseFloat(params[1]);
                    if (isNaN(newFontSize)) {
                        throw new Error(`size param cannot be parsed as float: ${line}`);
                    }
                    fontSize = newFontSize;
                    break;
                }
                case 'stroke_size': {
                    const params = line.split(/\s+/, 2);
                    if (params.length !== 2) {
                        throw new Error(`bad params -- stroke_size size: ${line}`);
                    }
                    const newFontSize = parseFloat(params[1]);
                    if (isNaN(newFontSize)) {
                        throw new Error(`size param cannot be parsed as float: ${line}`);
                    }
                    fontSize = newFontSize;
                    break;
                }
                case 'scale': {
                    const params = line.split(/\s+/, 3);
                    if (params.length !== 3) {
                        throw new Error(`bad params -- scale x_scale y_scale: ${line}`);
                    }
                    const xScale = parseFloat(params[1]);
                    const yScale = parseFloat(params[2]);
                    if (isNaN(xScale) || isNaN(yScale)) {
                        throw new Error(`s_scale/y_scale param cannot be parsed as float: ${line}`);
                    }

                    svgData = ImageUtils.scaleAsSvg(svgData, xScale, yScale);
                    break;
                }
                case 'expand': {
                    const params = line.split(/\s+/, 3);
                    if (params.length !== 3) {
                        throw new Error(`Bad params -- expand new_width new_height x_offset y_offset: ${line}`);
                    }
                    const newWidth = parseFloat(params[1]);
                    const newHeight = parseFloat(params[2]);
                    const xOffset = parseFloat(params[3]);
                    const yOffset = parseFloat(params[4]);
                    if (isNaN(newWidth) || isNaN(newHeight) || isNaN(xOffset) || isNaN(yOffset)) {
                        throw new Error(`new_width/new_height/x_offset/y_offset param cannot be parsed as float: ${line}`);
                    }

                    svgData = ImageUtils.expandAsSvg(svgData, newWidth, newHeight, xOffset, yOffset);
                    break;
                }
                case 'crop': {
                    const params = line.split(/\s+/, 5);
                    if (params.length !== 5) {
                        throw new Error(`bad params -- crop x_offset y_offset new_width new_height: ${line}`);
                    }
                    const xOffset = parseFloat(params[1]);
                    const yOffset = parseFloat(params[2]);
                    const newWidth = parseFloat(params[3]);
                    const newHeight = parseFloat(params[4]);
                    if (isNaN(xOffset) || isNaN(yOffset) || isNaN(newWidth) || isNaN(newHeight)) {
                        throw new Error(`x_offset/y_offset/new_width/new_height param cannot be parsed as float: ${line}`);
                    }

                    svgData = ImageUtils.cropAsSvg(svgData, xOffset, yOffset, newWidth, newHeight);
                    break;
                }
                case 'highlight': {
                    const params = line.split(/\s+/);
                    if (params.length !== 5) {
                        throw new Error(`Bad params -- highlight x_offset y_offset width height: ${line}`);
                    }
                    const xOffset = parseFloat(params[1]);
                    const yOffset = parseFloat(params[2]);
                    const width = parseFloat(params[3]);
                    const height = parseFloat(params[4]);
                    if (isNaN(xOffset) || isNaN(yOffset) || isNaN(width) || isNaN(height)) {
                        throw new Error(`x_offset/y_offset/width/height param cannot be parsed as float: ${line}`);
                    }
                    const points = [
                        {x: xOffset, y: yOffset},
                        {x: xOffset + width, y: yOffset},
                        {x: xOffset + width, y: yOffset + height},
                        {x: xOffset, y: yOffset + height}
                    ];

                    svgData = ImageUtils.highlightPolygonAsSvg(svgData, points, highlightColor);
                    break;
                }
                case 'highlight_poly': {
                    const params = line.split(/\s+/);
                    if (params.length < 1) {
                        throw new Error(`Bad params -- highlight_poly x1 y1 x2 y2 x3 y3 ...: ${line}`);
                    }
                    const points = (() => {
                        const arr = params.slice(1);
                        if (arr.length % 2 !== 0) {
                            throw new Error(`Require an even number of x/y points: ${line}`);
                        }
                        const ret: {x: number, y: number}[] = [];
                        for (let i = 0; i < arr.length; i += 2) {
                            const xVal = parseFloat(arr[i]);
                            const yVal = parseFloat(arr[i+1]);
                            if (isNaN(xVal) || isNaN(yVal)) {
                                throw new Error(`x/y point cannot be parsed as float: ${line}`);
                            }
                            ret.push({x: xVal, y: yVal});
                        }
                        return ret;
                    })();

                    svgData = ImageUtils.highlightPolygonAsSvg(svgData, points, highlightColor);
                    break;
                }
                case 'arrow': {
                    const params = line.split(/\s+/);
                    if (params.length < 1) {
                        throw new Error(`Bad params -- arrow x1 y1 x2 y2 ...: ${line}`);
                    }
                    const points = (() => {
                        const arr = params.slice(1);
                        if (arr.length % 2 !== 0) {
                            throw new Error(`Require an even number of x/y points: ${line}`);
                        }
                        const ret: {x: number, y: number}[] = [];
                        for (let i = 0; i < arr.length; i += 2) {
                            const xVal = parseFloat(arr[i]);
                            const yVal = parseFloat(arr[i+1]);
                            if (isNaN(xVal) || isNaN(yVal)) {
                                throw new Error(`x/y point cannot be parsed as float: ${line}`);
                            }
                            ret.push({x: xVal, y: yVal});
                        }
                        return ret;
                    })();
                    
                    svgData = ImageUtils.highlightArrowAsSvg(svgData, points, 6, highlightColor);
                    break;
                }
                case 'text': {
                    const params = line.split(/\s+/, 4);
                    if (params.length !== 4) {
                        throw new Error(`Bad params -- text x_offset y_offset word ...: ${line}`);
                    }
                    const xOffset = parseFloat(params[1]);
                    const yOffset = parseFloat(params[2]);
                    if (isNaN(xOffset) || isNaN(yOffset)) {
                        throw new Error(`x_offset/y_offset param cannot be parsed as float: ${line}`);
                    }
                    const text = getRemainder(line, /\s+/g, 3);

                    svgData = ImageUtils.highlightTextAsSvg(svgData, xOffset, yOffset, text, fontSize, highlightColor, fontColor);
                    break;
                }
                default:
                    throw new Error('Unrecognized image command: ' + command);
            }
        }

        const tmpPath = Path.resolve(FileSystem.mkdtempSync('/tmp/imgext'), 'data.svg');
        FileSystem.writeFileSync(tmpPath, svgData);
        
        const imgPath = context.injectFile(tmpPath);

        return `<img src="${markdownIt.utils.escapeHtml(imgPath)}" alt="${markdownIt.utils.escapeHtml(altText)}" title="${markdownIt.utils.escapeHtml(title)}" />`
    }
}




function getRemainder(str: string, sep: RegExp, idx: number) {
    while (true) {
        const sepRes = sep.exec(str);
        if (sepRes === null) {
            throw new Error(); // this hsould never happen
        }
        str = str.slice(sep.lastIndex);
        sep.lastIndex = 0;

        idx--;
        if (idx === 0) {
            return str;
        }
    }
}