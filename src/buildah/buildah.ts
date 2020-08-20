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

const VERSION_REGEX = /buildah version ([^\s]+).*/i;
export function buildahVersionCheck() {
    try {
        const versionString = ChildProcess.execSync('buildah --version', { encoding: 'utf8' });
        const regexRes = VERSION_REGEX.exec(versionString);

        if (regexRes === null) {
            throw new Error('Unrecognized buildah version string:' + versionString);
        }
        
        if (regexRes[1].startsWith('1.9') === false) {
            throw new Error('Unrecognized buildah version number:' + regexRes[1]);
        }
    } catch (err) {
        throw new Error('Buildah check failed -- is it installed?\n\n' + JSON.stringify(err));
    }
}






export function createContainer(environmentDir: string, containerName: string, dockerScript: string, dockerScriptDataFiles: string[]) {
    createEnvIfNotExists(environmentDir);
    if (existsContainer(environmentDir, containerName)) {
        return;
    }


    // Place in docker file and related files
    const dockerFile = environmentDir + '/Dockerfile';
    FileSystem.writeFileSync(dockerFile, dockerScript, { encoding: 'utf8' });

    for (const srcPath of dockerScriptDataFiles) {
        const filename = Path.basename(srcPath);
        const dstPath = Path.resolve(environmentDir, filename);
        FileSystem.copySync(srcPath, dstPath, { errorOnExist: true, recursive: true });
    }


    // Run
    const imageName = containerName + '_image';
    execBuildah(environmentDir, ['--network=host', 'build-using-dockerfile', '-t', imageName, '-f', 'Dockerfile', '.']);
    execBuildah(environmentDir, ['--name', containerName, 'from', 'localhost/' + imageName]);
}

export function createContainerRaw(environmentDir: string, containerName: string) {
    createEnvIfNotExists(environmentDir);
    if (existsContainer(environmentDir, containerName)) {
        return;
    }


    // Run
    const imageName = containerName + '_image';
    execBuildah(environmentDir, ['--network=host', 'build-using-dockerfile', '-t', imageName, '-f', 'Dockerfile', '.']);
    execBuildah(environmentDir, ['--name', containerName, 'from', 'localhost/' + imageName]);
}







export function existsContainer(environmentDir: string, containerName: string) {
    createEnvIfNotExists(environmentDir);


    const stdout = execBuildah(environmentDir, ['containers', '--noheading', '--notruncate', '--format', '{{.ContainerName}}']).stdout.toString('utf8');
    const containerNames = stdout.split(/[\r\n]+/);
    return containerNames.indexOf(containerName) !== -1;
}







export interface LaunchContainerConfiguration {
    timeout?: number;
    volumeMappings?: LaunchVolumeMapping[];
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

export function launchContainer(environmentDir: string, containerName: string, command: string[], config?: LaunchContainerConfiguration) {
    createEnvIfNotExists(environmentDir);
    const timeout = config === undefined ? undefined : config.timeout;
    const volumeMappings = config === undefined ? undefined : config.volumeMappings;


    // Make sure params are valid
    if (command.length === 0) {
        throw new Error('Empty command');
    }

    FileSystem.ensureDirSync(environmentDir);

    const args: string[] = [];
    args.push('--network=host');
    args.push('--pid=host');
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
    args.push('run', containerName);
    args.push(... command);

    // Execute container and move output data back
    execBuildah(environmentDir, args, timeout);
}











function createEnvIfNotExists(environmentDir: string) {
    const confDir = Path.resolve(environmentDir, 'conf');
    const confFile = Path.resolve(confDir, 'registries.conf');
    if (FileSystem.existsSync(confFile) === false) {
        FileSystem.mkdirpSync(confDir);
        FileSystem.writeFileSync(
            confFile,
            `
[registries.search]
registries = ['docker.io']

[registries.insecure]
registries = []

[registries.block]
registries = []
            `,
            { encoding: 'utf8' }
        );
    }
}








const BASE_ARGS: ReadonlyArray<string> = ['--root', 'root/', '--runroot', 'runroot/', '--registries-conf', 'conf/registries.conf', '--registries-conf-dir', 'conf/registries.d'];

function execBuildah(workDir: string, args: ReadonlyArray<string>, timeout?: number) {
    const spawnRet = ChildProcess.spawnSync(
        'buildah',
        BASE_ARGS.concat(args),
        {
            cwd: workDir,
            timeout: timeout
        }
    );

    if (spawnRet.status !== 0) {
        throw new Error('Buildah failed with status ' + spawnRet.status
            + '\n----\n' + spawnRet.stdout.toString('utf8')
            + '\n----\n' + spawnRet.stderr.toString('utf8'));
    }

    return {
        stdout: spawnRet.stdout,
        stderr: spawnRet.stderr
    }
}