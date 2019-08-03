import FileSystem from 'fs-extra';
import MarkdownIt from 'markdown-it';
import CsvParse from 'csv-parse/lib/sync';
import { ExtensionContext } from './extender_plugin';

export function outputFileToHtml(filepath: string, markdownIt: MarkdownIt, context: ExtensionContext) {
    if (filepath.toLowerCase().endsWith('.txt')) {
        const data = FileSystem.readFileSync(filepath, { encoding: 'utf8' });
        return `<pre>${markdownIt.utils.escapeHtml(data)}</pre>`;
    } else if (filepath.toLowerCase().endsWith('.svg')
        || filepath.toLowerCase().endsWith('.png')
        || filepath.toLowerCase().endsWith('.gif')
        || filepath.toLowerCase().endsWith('.jpg')
        || filepath.toLowerCase().endsWith('.jpeg')) {
        const imageHtmlPath = context.injectFile(filepath);
        return `<p><img src="${markdownIt.utils.escapeHtml(imageHtmlPath)}" alt="Generated image" /></p>`;
    } else if (filepath.toLowerCase().endsWith('.csv')) {
        const data = FileSystem.readFileSync(filepath, { encoding: 'utf8' });
        const records = CsvParse(data, {
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
            const headerRow = i === 0;
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
    } else {
        throw new Error('Generated output file contains unknown extension: ' + filepath);
    }
}