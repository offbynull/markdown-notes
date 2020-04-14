const fs = require('fs');
const input = fs.readFileSync("/input/input.data", {encoding:'utf8'});
fs.writeFileSync("/output/output.md", "This is a INLINE macro that outputs Markdown text with a link: [" + input + "](http://www.google.com)!", { encoding: 'utf8' });