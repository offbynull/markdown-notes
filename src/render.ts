import * as FileSystem from 'fs-extra';
import * as Process from 'process';
import * as Path from 'path';
import Markdown from './markdown/markdown';
import { macroScan } from './markdown/macro_helper';
import { gitRespectingCopySync as gitExclusionRespectingCopySync } from './utils/file_utils';
import { isGitInstalled } from './utils/git_utils';

const majorNodeVer = /^v(\d+)/g.exec(Process.version);
if (majorNodeVer == null || Number(majorNodeVer[1]) < 16) {
    throw new Error(`Node version is too old: ${Process.version}`);
}

if (Process.argv.length !== 6) {
    throw 'Invalid arguments: ' + JSON.stringify(Process.argv);
}

const machineCachePath = Path.resolve(process.cwd(), '.cache');
const existingRenderCachePath = Process.argv[2];
const inputPath = Process.argv[3];
const outputPath = Process.argv[4];
const tempPath = Process.argv[5];

const tempRenderCachePath = tempPath + '/cache';
const tempInputPath = tempPath + '/input';
const tempRenderPath = tempPath + '/output';

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
FileSystem.mkdirpSync(tempRenderCachePath);

// Render input.md to output.html
const mdInput = FileSystem.readFileSync(tempRenderPath + '/input.md', { encoding: 'utf8'});
FileSystem.unlinkSync(tempRenderPath + '/input.md');

const customMacroDefs = macroScan(tempInputPath);
const mdOutput = new Markdown(machineCachePath, existingRenderCachePath, tempRenderCachePath, tempInputPath, '', tempRenderPath, customMacroDefs).render(mdInput);
FileSystem.writeFileSync(tempRenderPath + '/output.html', mdOutput);
FileSystem.removeSync(outputPath);
FileSystem.renameSync(tempRenderPath, outputPath);
FileSystem.removeSync(existingRenderCachePath);
FileSystem.renameSync(tempRenderCachePath, existingRenderCachePath);