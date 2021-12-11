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

if (Process.argv.length !== 7) {
    throw 'Invalid arguments: ' + JSON.stringify(Process.argv);
}

const machineCachePath = Path.resolve(process.cwd(), '.cache');
const existingRenderCachePath = Process.argv[2];  // real render cache path from previous run
const inputPath = Process.argv[3];                // real input path
const tempRenderPath = Process.argv[4];           // temp dir for new render output -- when process completes successfully, this will get moved to real render output dir
const tempRenderCachePath = Process.argv[5];      // temp dir for new render cache -- when process completes successfully, this will get moved to real render cache dir
const workPath = Process.argv[6];                 // temp dir for transient files -- temp work goes here, don't use OS's temp directory because this one will get immediately cleaned up by the caller

// WHATS THE POINT OF ALL THE TEMPORARY OUTPUT DIRECTORIES ABOVE? REMEMBER THAT THIS PROCESS IS LAUNCHED BY A PARENT THAT CAN SIGKILL IT AT ANY TIME. THE TEMPORARY OUTPUT DIRS MAKE IT SO THAT IF THE
// PROCESS DOES GET SIGKILL'D, IT DOESN'T END UP WITH INCOMPLETE / JUNK DATA IN THE REAL OUTPUT DIR. THE PARENT PROCESS WILL MOVE EVERYTHING OVER ONLY IF THIS PROCESS SUCCESSFULLY EXITS.

const tempInputPath = workPath + '/input';        // temp dir for input -- some input files need to be ignored, see block that immediately follows

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