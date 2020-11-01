const parse = require('csv-parse/lib/sync')
const fs = require('fs');

let content = fs.readFileSync('/input/input.data', 'utf8').trim();
const lines = content.split(/[\r\n]/g);

// interface CsvExtensionConfig {
//     firstLineHeader?: boolean;
//     quote?: string;
//     delimiter?: string;
//     escape?: string;
//     comment?: string;
//     skipEmptyLines?: boolean;
// }

// MARKDOWN_CONFIG
let config = {};
if (lines.length > 0 && lines[0].startsWith('!!')) {
    try {
        const configText = lines[0].substring(2);
        config = JSON.parse(configText);
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
// MARKDOWN_CONFIG

const records = parse(content, {
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

const recordsAsArray = records;
let ret = '';
ret += '<table>';
for (let i = 0; i < recordsAsArray.length; i++) {
    const record = recordsAsArray[i];
    const headerRow = config.firstLineHeader === true && i === 0;
    ret += '<tr>';
    for (let j = 0; j < record.length; j++) {
        const data = record[j]       // escape html - https://stackoverflow.com/a/6234804
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\[/g, "\\[")  // escape md
            .replace(/\]/g, "\\]")
            .replace(/`/g, "\\`");
        ret += headerRow ? '<th>' : '<td>';
        ret += data;
        ret += headerRow ? '</th>' : '</td>';
    }
    ret += '</tr>';
}
ret += '</table>';
fs.writeFileSync('/output/output.md', ret, { encoding: 'utf8' });