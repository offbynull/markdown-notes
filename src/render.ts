import * as FileSystem from 'fs-extra';
import * as Process from 'process';
import * as Path from 'path';
import Markdown from './markdown/markdown';
import { inlineHtml } from './utils/html_utils';
import { macroScan } from './markdown/macro_helper';
import { forceAllChildrenToDestination, gitRespectingCopySync as gitExclusionRespectingCopySync, recursiveCheckForMissingOrMismatched } from './utils/file_utils';
import { isGitInstalled } from './utils/git_utils';

const majorNodeVer = /^v(\d+)/g.exec(Process.version);
if (majorNodeVer == null || Number(majorNodeVer[1]) < 16) {
    throw new Error(`Node version is too old: ${Process.version}`);
}

if (Process.argv.length !== 6) {
    throw 'Invalid arguments: ' + JSON.stringify(Process.argv);
}

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
const tempPath = Process.argv[5];

const tempInputPath = tempPath + '/input';
const tempRenderPath = tempPath + '/output';

// Ensure the cache is consistent with what's in last render's macro outputs. Why? In certain cases, the exact same macro produces different outputs on different machines. For
// example, sometimes macros that output images put the timestamp that image was generated as metadata in the image. This especially becomes a problem when using version control.
// This check helps keep things consistent across machines.
const outputMacroBackupsPath = outputPath + '/.macro_output_backup'; 
if (FileSystem.pathExistsSync(outputMacroBackupsPath)) {
    const mismatched = recursiveCheckForMissingOrMismatched(outputMacroBackupsPath, cachePath);
    if (mismatched.length > 0) {
        console.warn("Cache consistency issue: Previous render produced macro outputs that are inconsistent with what's in the cache...");
        for (const p of mismatched) {
            console.warn(p);
        }
        console.warn('--------');
        console.warn(`Synching cache with previously rendered macros...`);
        forceAllChildrenToDestination(outputMacroBackupsPath, cachePath);
    }
}

// For consistent rendering across machines, don't include input files that are excluded in git / that are empty dirs. Copy
// input into a temp folder where excluded files and empty dirs are not included. That temp folder is used for the render.
if (isGitInstalled(inputPath)) {
    gitExclusionRespectingCopySync(inputPath, tempInputPath, undefined,
        undefined /* p => console.debug(`Git skip: Empty directory at ${p}`) */,
        p => console.warn(`Git consistency issue: Ignored file staged/committed at ${p}`),
        undefined /* p => console.debug(`Git skip: Ignored file at ${p}`) */
    );
} else {
    FileSystem.copySync(inputPath, tempInputPath); // This seems wasteful, maybe just do tempInputPath = inputPath here because inputs are only ever read from / never written to
}

FileSystem.copySync(tempInputPath, tempRenderPath);

// Render input.md to output.html
const mdInput = FileSystem.readFileSync(tempRenderPath + '/input.md', { encoding: 'utf8'});
FileSystem.unlinkSync(tempRenderPath + '/input.md');

const customMacroDefs = macroScan(tempInputPath);
const mdOutput = new Markdown(cachePath, tempInputPath, '', tempRenderPath, customMacroDefs).render(mdInput);
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