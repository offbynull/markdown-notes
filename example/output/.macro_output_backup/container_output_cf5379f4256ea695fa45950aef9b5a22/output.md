`{bm-disable-all}`[csv_macro_block/input/code.js](csv_macro_block/input/code.js) (lines 30 to 48):`{bm-enable-all}`

```js
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
```