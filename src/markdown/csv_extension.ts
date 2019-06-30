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
import CsvParse from 'csv-parse/lib/sync';
import { Extension, TokenIdentifier, Type } from "./extender_plugin";

interface CsvExtensionConfig {
    firstLineHeader?: boolean;
    quote?: string;
    delimiter?: string;
    escape?: string;
    comment?: string;
    skipEmptyLines?: boolean;
}

export class CsvExtension implements Extension {
    public readonly tokenIds: ReadonlyArray<TokenIdentifier> = [
        new TokenIdentifier('csv', Type.BLOCK)
    ];

    public render(markdownIt: MarkdownIt, tokens: Token[], tokenIdx: number, context: Map<string, any>): string {
        const token = tokens[tokenIdx];
        let content = token.content.trim();
        const lines = content.split(/[\r\n]/g);

        let config: CsvExtensionConfig = {};
        if (lines.length > 0 && lines[0].startsWith('!!')) {
            try {
                const configText = lines[0].substring(2);
                config = JSON.parse(configText) as CsvExtensionConfig;
                if ((typeof(config.firstLineHeader) === 'boolean' || config.firstLineHeader === undefined)
                        && (typeof(config.quote) === 'string' || config.quote === undefined)
                        && (typeof(config.delimiter) === 'string' || config.delimiter === undefined)
                        && (typeof(config.escape) === 'string' || config.escape === undefined)
                        && (typeof(config.comment) === 'string' || config.comment === undefined)
                        && (typeof(config.skipEmptyLines) === 'boolean' || config.skipEmptyLines === undefined)) {
                    lines.shift(); // removes the first line
                    content = lines.join('\n');
                } else {
                    config = {};
                }
            } catch (err) {
                // we couldn't parse the first line as a config, so just leave it in as-is
            }
        }

        const records = CsvParse(content, {
            columns: false,
            // eslint-disable-next-line @typescript-eslint/camelcase
            auto_parse: false,
            // eslint-disable-next-line @typescript-eslint/camelcase
            auto_parse_date: false,
            quote: config.quote,
            delimiter: config.delimiter,
            escape: config.escape,
            comment: config.comment,
            // eslint-disable-next-line @typescript-eslint/camelcase
            skip_empty_lines: config.skipEmptyLines,
            // eslint-disable-next-line @typescript-eslint/camelcase
            relax_column_count: true
        });

        if (Array.isArray(records) === false) {
            throw 'CSV did not parse to array'; // this should never happen
        }

        const recordsAsArray = records as string[][];
        let ret = '';
        ret += '<table>';
        for (let i = 0; i < recordsAsArray.length; i++) {
            const record = recordsAsArray[i];
            const headerRow = config.firstLineHeader === true && i === 0;
            ret += '<tr>';
            for (let j = 0; j < record.length; j++) {
                const data = record[j];
                ret += headerRow ? '<th>' : '<td>';
                ret += markdownIt.utils.escapeHtml(data);
                ret += headerRow ? '</th>' : '</td>';
            }
            ret += '</tr>';
        }
        ret += '</table>';
        return ret;
    }
}