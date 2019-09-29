import * as FileSystem from 'fs-extra';
import * as Process from 'process';
import * as Path from 'path';
import Markdown from './markdown/markdown';
import { inlineHtml } from './utils/html_utils';

if (Process.argv.length !== 5) {
    throw 'Invalid arguments: ' + JSON.stringify(Process.argv);
}

const tempRenderPath = FileSystem.mkdtempSync('/tmp/render');
const cachePath = Path.resolve(process.cwd(), '.cache');
const inputPath = Process.argv[2];
const outputPath = Process.argv[3];
const pack = (() => {
    switch (Process.argv[4]) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            throw new Error(`${Process.argv[4]} unrecognized. Must be either true or false.`);
    }
})();

FileSystem.copySync(inputPath, tempRenderPath);

// Render input.md to output.html
const mdInput = FileSystem.readFileSync(tempRenderPath + '/input.md', { encoding: 'utf8'});
FileSystem.unlinkSync(tempRenderPath + '/input.md');

const mdOutput = new Markdown(cachePath, inputPath, '', tempRenderPath).render(mdInput);
if (pack) {
    // Inline rendered file
    inlineHtml(mdOutput, tempRenderPath, (inlineOutput) => {
        FileSystem.removeSync(tempRenderPath);
        FileSystem.removeSync(outputPath);
        FileSystem.mkdirpSync(outputPath);
        FileSystem.writeFileSync(outputPath + '/output.html', inlineOutput);
    });
} else {
    FileSystem.writeFileSync(tempRenderPath + '/output.html', mdOutput);
    FileSystem.removeSync(outputPath);
    FileSystem.renameSync(tempRenderPath, outputPath);
}