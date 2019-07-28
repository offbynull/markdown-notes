import * as FileSystem from 'fs-extra';
import * as Process from 'process';
import * as Path from 'path';
import Markdown from './markdown/markdown';
import { inlineHtml } from './utils/html_utils';
import { r } from 'tar';

if (Process.argv.length !== 3) {
    throw 'Invalid arguments: ' + JSON.stringify(Process.argv);
}

const tempRenderPath = FileSystem.mkdtempSync('/tmp/render');
const inputPath = Process.argv[2];
const cachePath = Path.resolve(process.cwd(), '.cache');

try {
    FileSystem.copySync(inputPath, tempRenderPath);

    // Render input.md to output.html
    const mdInput = FileSystem.readFileSync(tempRenderPath + '/input.md', { encoding: 'utf8'});
    const mdOutput = new Markdown(cachePath, inputPath, '', tempRenderPath).render(mdInput);

    // Inline rendered file
    inlineHtml(mdOutput, tempRenderPath, (inlineOutput) => {
        if (Process.send !== undefined) {
            Process.send({
                type: 'output',
                data: inlineOutput
            });
        }
    });
} catch (e) {
    if (Process.send !== undefined) {
        const errorText = (() => {
            if (typeof e === 'string') {
                return e;
            } else if (typeof e['toString'] == 'function') {
                return e.toString() as string;
            } else {
                return JSON.stringify(e);
            }
        })();
        Process.send({
            type: 'error',
            data: errorText
        });
    }
    throw e;
}