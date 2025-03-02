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

import FileSystem from 'fs-extra';
import Path from 'path';
import ChildProcess from 'child_process';

const VERSION_REGEX = /podman version ([^\s]+).*/i;
export function podmanVersionCheck() {
    try {
        const versionString = ChildProcess.execSync('podman --version', { encoding: 'utf8' });
        const regexRes = VERSION_REGEX.exec(versionString);

        if (regexRes === null) {
            throw new Error('Unrecognized podman version string:' + versionString);
        }
        
        if (regexRes[1].startsWith('3.4') === false) {
            throw new Error('Unrecognized podman version number:' + regexRes[1]);
        }
    } catch (err) {
        throw new Error('Podman check failed -- is it installed?\n\n' + JSON.stringify(err));
    }
}






export function createImage(environmentDir: string, imageName: string, dockerScript: string, dockerScriptDataFiles: string[]) {
    createEnvIfNotExists(environmentDir);
    if (existsImage(environmentDir, imageName)) {
        return;
    }

    // Place in docker file and related files
    const dockerFile = environmentDir + '/Dockerfile';
    FileSystem.writeFileSync(dockerFile, dockerScript, { encoding: 'utf8' });

    for (const srcPath of dockerScriptDataFiles) {
        const filename = Path.basename(srcPath);
        const dstPath = Path.resolve(environmentDir, filename);
        FileSystem.copySync(srcPath, dstPath, { errorOnExist: true });
    }

    // Run
    execPodman(environmentDir, ['build', '--network=host', '--tag', imageName + '_image', '--file', 'Dockerfile', '.']);
}

export function createImageRaw(environmentDir: string, imageName: string) {
    createEnvIfNotExists(environmentDir);
    if (existsImage(environmentDir, imageName)) {
        return;
    }

    // Run
    execPodman(environmentDir, ['build', '--network=host', '--tag', imageName + '_image', '--file', 'Dockerfile', '.']);
}







export function existsImage(environmentDir: string, imageName: string) {
    createEnvIfNotExists(environmentDir);

    const stdout = execPodman(environmentDir, ['image', 'list', '--noheading', '--no-trunc', '--format', 'json']).stdout.toString('utf8');
    const images = JSON.parse(stdout)
    if (images.length == 0) {
        return false;
    }
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.hasOwnProperty('Names') && image.Names.indexOf('localhost/' + imageName + '_image:latest') !== -1) {
            return true;
        }
    }
    return false;
}







export interface LaunchContainerConfiguration {
    timeout?: number;
    volumeMappings?: LaunchVolumeMapping[];
    environmentVariables?: EnvironmentVariable[];
}

export class LaunchVolumeMapping {
    public readonly hostPath: string;
    public readonly guestPath: string;
    public readonly mode: 'r' | 'rw';

    public constructor(hostPath: string, guestPath: string, mode: 'r' | 'rw') {
        this.hostPath = Path.resolve(hostPath);
        this.guestPath = Path.resolve(guestPath);
        this.mode = mode;

        if (hostPath.includes(':')) {
            throw new Error(`Host path cannot colon: ${this.hostPath}`); // this is fixed in the --mount tag in later versions (not yet deployed), see https://github.com/containers/buildah/issues/1597
        }
        if (guestPath.includes(':')) {
            throw new Error(`Guest path cannot colon: ${this.guestPath}`); // this is fixed in the --mount tag in later versions (not yet deployed), see https://github.com/containers/buildah/issues/1597
        }
    }
}

export class EnvironmentVariable {
    public readonly name: string;
    public readonly value: string;

    public constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }
}

export function launchContainer(environmentDir: string, imageName: string, command: string[], config?: LaunchContainerConfiguration) {
    createEnvIfNotExists(environmentDir);
    const timeout = config === undefined ? undefined : config.timeout;
    const volumeMappings = config === undefined ? undefined : config.volumeMappings;
    const environmentVariables = config === undefined ? undefined : config.environmentVariables;


    // Make sure params are valid
    if (command.length === 0) {
        throw new Error('Empty command');
    }

    FileSystem.ensureDirSync(environmentDir);

    const args: string[] = [];
    args.push('run')
    args.push('--rm')
    args.push('--network=host');
    args.push('--pid=host');
    args.push('--stop-signal=SIGKILL')
    args.push('--restart=no')
    // args.push('--cidfile=.cid')  - Use this file with "podman kill --cidfile ..." to gracefully kill container (right now we're just killing process tree, which is likely leaving dangling resources)
    if (volumeMappings !== undefined) {
        for (const volumeMapping of volumeMappings) {
            const volMode = (() => {
                switch (volumeMapping.mode) {
                    case 'r':
                        return 'ro';
                    case 'rw':
                        return 'Z';
                    default:
                        throw new Error(); // this should never happen
                }
            })();
            args.push('--volume', volumeMapping.hostPath + ':' + volumeMapping.guestPath + ':' + volMode);
        }
    }
    if (environmentVariables !== undefined) {
        for (const environmentVariable of environmentVariables) {
            args.push('--env', environmentVariable.name + '=' + environmentVariable.value);
        }
    }
    args.push(imageName + '_image');
    args.push(... command);

    // Execute container and move output data back
    execPodman(environmentDir, args, timeout);
}






export function removeAll(environmentDir: string) {
    execPodman(environmentDir, ['stop', '-a']);
    execPodman(environmentDir, ['rm', '-a']);
    execPodman(environmentDir, ['rmi', '-a']);
    execPodman(environmentDir, ['volume', 'rm', '-a']);
}










// Previous version where registries.conf was being created:
//  https://github.com/offbynull/markdown-notes/blob/5f02778f984f90a1354901748ec15d22e1149a6a/src/buildah/buildah.ts#L193
function createEnvIfNotExists(environmentDir: string) {
    FileSystem.mkdirpSync(environmentDir);
}








const BASE_ARGS: ReadonlyArray<string> = ['--root', 'root/', '--runroot', 'runroot/'];

function execPodman(workDir: string, args: ReadonlyArray<string>, timeout?: number) {
    const spawnRet = ChildProcess.spawnSync(
        'podman',
        BASE_ARGS.concat(args),
        {
            cwd: workDir,
            timeout: timeout
        }
    );

    if (spawnRet.status !== 0) {
        throw new Error('Podman failed with status ' + spawnRet.status + ' signal ' + spawnRet.signal + ' error ' + spawnRet.error
            + '\n----\n' + spawnRet.stdout
            + '\n----\n' + spawnRet.stderr);
    }

    return {
        stdout: spawnRet.stdout,
        stderr: spawnRet.stderr
    }
}