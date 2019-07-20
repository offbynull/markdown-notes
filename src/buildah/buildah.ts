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
import Tar from 'tar';
import HashUtils from '../utils/hash_utils';

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






export function createContainer(dockerScript: string, dockerScriptDataFiles: string[], containerName: string, environmentArchiveFile: string) {
    // Make sure params are valid
    if (containerName.length === 0) {
        throw new Error('Empty container name');
    }


    const workDir = FileSystem.mkdtempSync('/tmp/buildah');


    // Place in docker file and related files
    const dockerFile = workDir + '/Dockerfile';
    FileSystem.writeFileSync(dockerFile, dockerScript, { encoding: 'utf8' });

    for (const srcPath of dockerScriptDataFiles) {
        const filename = Path.basename(srcPath);
        const dstPath = Path.resolve(workDir, filename);
        FileSystem.copySync(srcPath, dstPath, { errorOnExist: true, recursive: true });
    }


    // Create temp environment dir, write out docker file, and build image + container
    const confDir = workDir + '/conf';
    FileSystem.mkdirpSync(confDir);
    const confFile = confDir + '/registries.conf';
    FileSystem.writeFileSync(
        confFile,
        `
        [registries.search]
        registries = ['docker.io', 'registry.fedoraproject.org', 'quay.io', 'registry.access.redhat.com', 'registry.centos.org']
        
        [registries.insecure]
        registries = []

        [registries.block]
        registries = []
        `,
        { encoding: 'utf8' }
    );
    

    execBuildah(workDir, ['--network=host', 'build-using-dockerfile', '-t', 'image', '-f', 'Dockerfile', '.']);
    execBuildah(workDir, ['--name', 'container', 'from', 'localhost/image']);


    // Remove docker file and related files (so they won't be included in the final package)
    FileSystem.remove(dockerFile);
    for (const srcFile of dockerScriptDataFiles) {
        const filename = Path.basename(srcFile);
        const dstPath = Path.resolve(workDir, filename);
        FileSystem.removeSync(dstPath);
    }


    // Archive work dir and write out to environment file path
    const filesToTar = FileSystem.readdirSync(workDir);
    Tar.create({
        gzip: true,
        sync: true,
        cwd: workDir,
        file: environmentArchiveFile 
    }, filesToTar);
}







export interface LaunchContainerConfiguration {
    timeout?: number;
    cacheDir?: string;
}

export function launchContainer(environmentArchiveFile: string, containerName: string, inputDir: string, outputDir: string, command: string[], config?: LaunchContainerConfiguration) {
    const timeout = config === undefined ? undefined : config.timeout;
    const cacheDir = config === undefined ? undefined : config.cacheDir;
    const containerCacheDir = (() => {
        if (cacheDir === undefined) {
            return undefined;
        } else {
            const containerNameHash = HashUtils.md5(containerName);
            const commandHash = HashUtils.md5Array(command);
            const inputDirDataHash = HashUtils.md5Path(inputDir);
            
            const finalHash = HashUtils.md5(containerNameHash + commandHash + inputDirDataHash);  
            return Path.resolve(cacheDir, finalHash);
        }
    })();


    // If launch was cached, return cached output
    if (containerCacheDir !== undefined) {
        if (FileSystem.existsSync(containerCacheDir) && FileSystem.statSync(containerCacheDir).isDirectory()) {
            FileSystem.copySync(containerCacheDir, outputDir);
            return;
        } else {
            FileSystem.removeSync(containerCacheDir); // remove just incase
        }
    }


    // Make sure params are valid
    if (command.length === 0) {
        throw new Error('Empty command');
    }

    inputDir = Path.resolve(inputDir); // to absolute path
    outputDir = Path.resolve(outputDir); // to absolute path
    FileSystem.ensureFileSync(environmentArchiveFile);


    // Dump out environment into temp dir and ensure everything is valid
    const workDir = FileSystem.mkdtempSync('/tmp/buildah');
    Tar.extract({
        sync: true,
        cwd: workDir,
        file: environmentArchiveFile 
    });

    const stdout = execBuildah(workDir, ['containers', '--noheading', '--notruncate', '--format', '{{.ContainerName}}']).stdout.toString('utf8');
    const containerNames = stdout.split(/[\r\n]+/);

    if (containerNames.indexOf(containerName) === -1) {
        throw new Error('Container not found: ' + containerName);
    }


    // Set up temp dir for input and output data
    const dataDir = FileSystem.mkdtempSync('/tmp/data');
    const dataInputDir = dataDir + '/input';
    const dataOutputDir = dataDir + '/output';

    FileSystem.mkdirpSync(dataInputDir);
    FileSystem.mkdirpSync(dataOutputDir);
    FileSystem.copySync(inputDir, dataInputDir);

    // sanity check, should never happen
    if (dataInputDir.includes(':')) {
        throw new Error('Input folder path cannot colon'); // this is fixed the --mount tag in later versions (not yet deployed), see https://github.com/containers/buildah/issues/1597
    }

    // sanity check, should never happen
    if (dataOutputDir.includes(':')) {
        throw new Error('Output folder path cannot colon'); // this is fixed the --mount tag in later versions (not yet deployed), see https://github.com/containers/buildah/issues/1597
    }


    // Execute container and move output data back
    execBuildah(workDir, [/*'--network=host', */'--volume', dataDir + ':/data:z', 'run', containerName].concat(command), timeout);
    FileSystem.copySync(dataOutputDir, outputDir);


    // Cache this launch's output
    if (containerCacheDir !== undefined) {
        FileSystem.mkdirpSync(containerCacheDir);
        FileSystem.copySync(outputDir, containerCacheDir);
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