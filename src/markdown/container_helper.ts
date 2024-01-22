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
import Crypto from 'crypto';
import Path from 'path';
import * as Podman from '../podman/podman';

export function runContainer(
    friendlyName: string,
    containerSetupDir: string,
    inputDir: string,
    inputOverrides: Map<string, string | Buffer>,
    outputDir: string,
    machineCacheDir: string,
    oldRenderCacheDir: string,
    newRenderCacheDir: string
) {
    // If input overrides available, copy inputs to tmp dir and apply overrides    
    let tmpDir: string | null = null;
    if (inputOverrides.size !== 0) {
        tmpDir = FileSystem.mkdtempSync('/tmp/inputoverrides');
        FileSystem.copySync(inputDir, tmpDir);
        for (const e of inputOverrides.entries()) {
            const overridePath = Path.normalize(Path.resolve(tmpDir, e[0]));
            if (Path.relative(tmpDir, overridePath).startsWith('..')) {
                throw new Error(`Cannot inject outside of input directory: ${e[0]}`);
            }
            const overridePathDir = Path.dirname(overridePath);
            FileSystem.mkdirpSync(overridePathDir);

            const value = e[1]
            if (typeof value === 'string') {
                FileSystem.writeFileSync(overridePath, value, { encoding: 'utf8' });
            } else {
                FileSystem.writeFileSync(overridePath, value);
            }
        }
        inputDir = tmpDir;
    }

    // Create container helper
    const ch = new ContainerHelper(
        friendlyName,
        containerSetupDir,
        inputDir,
        outputDir,
        machineCacheDir,
        oldRenderCacheDir,
        newRenderCacheDir
    );

    ch.run();

    // Remove tmp directory if it was created
    if (tmpDir !== null) {
        FileSystem.removeSync(tmpDir);
    }

    return { updatedInputDir: inputDir, updatedOutputDir: outputDir, finalCacheDir: ch.cachedOutputInNewRenderDir };
}

export class ContainerHelper {
    private readonly containerHash: string;
    public readonly dataHash: string;
    public readonly containerDir: string;
    public readonly cachedOutputInOldRenderDir: string;
    public readonly cachedOutputInNewRenderDir: string;
    public readonly cachedOutputInMachineDir: string;
    constructor(
        private readonly friendlyName: string,
        private readonly setupDir: string,  // files required to setup the container
        private readonly inputDir: string,
        private readonly outputDir: string,
        machineCacheDir: string,
        oldRenderCacheDir: string,
        newRenderCacheDir: string,
        private readonly hashFilename: string = '.__UNIQUE_INPUT_ID'
    ) {
        const containerHasher = Crypto.createHash('md5');
        hashDirectory(containerHasher, setupDir);
        this.containerHash = containerHasher.digest('hex');

        const dataHasher = Crypto.createHash('md5');
        dataHasher.update('container');
        dataHasher.update(this.containerHash);
        dataHasher.update('data');
        hashDirectory(dataHasher, inputDir);
        dataHasher.update('hashfilename');
        dataHasher.update(hashFilename);
        this.dataHash = dataHasher.digest('hex');

        const renderDirName = 'output_' + this.dataHash;
        const containerDirName = 'container_' + friendlyName + '_' + this.containerHash;
        this.cachedOutputInOldRenderDir = Path.resolve(oldRenderCacheDir, renderDirName);
        this.cachedOutputInNewRenderDir = Path.resolve(newRenderCacheDir, renderDirName);
        this.cachedOutputInMachineDir = Path.resolve(machineCacheDir, renderDirName);
        this.containerDir = Path.resolve(machineCacheDir, containerDirName);  // location of the actual container
    }

    public run() {
        // Is it cached from the last render? Copy it to the new render + the new render cache + the machine cache.
        // Is it cached in the machine cache? Copy it to the new render + the new render cache.
        // Otherwise, render it + copy it to the new render + the new render cache + the machine cache.
        
        // cachedOutputInMachineDir is the important dir -- you should not have incomplete data written to it if a SIGKILL happens
        // ON SIGKILL:
        //    * newRenderDir will be fine if incomplete (it gets ignored on SIGKILL).
        //    * oldRenderDir will be fine (should never be written to, only read from).
        //    * machineDir will HOPEFULLY be fine (writes go to a temp dir, which gets renamed to the machine dir on completion -- if rename is atomic then a SIGKILL won't put bad data in machine cache)
        if (FileSystem.existsSync(this.cachedOutputInOldRenderDir)) {
            if (!FileSystem.lstatSync(this.cachedOutputInOldRenderDir).isDirectory()) {
                throw new Error('Non-directory exists for cached output? ' + this.cachedOutputInOldRenderDir);
            }
            FileSystem.copySync(this.cachedOutputInOldRenderDir, this.cachedOutputInNewRenderDir);
            FileSystem.copySync(this.cachedOutputInOldRenderDir, this.outputDir);
            this.safeCopyToMachineCache(this.cachedOutputInOldRenderDir);
            return;
        } else if (FileSystem.existsSync(this.cachedOutputInMachineDir)) {
            if (!FileSystem.lstatSync(this.cachedOutputInMachineDir).isDirectory()) {
                throw new Error('Non-directory exists for cached output? ' + this.cachedOutputInOldRenderDir);
            }
            FileSystem.copySync(this.cachedOutputInMachineDir, this.cachedOutputInNewRenderDir);
            FileSystem.copySync(this.cachedOutputInMachineDir, this.outputDir);
            return;
        }

        // Run
        this.initializeContainer();
        this.launchContainer();
        
        // Cache output
        FileSystem.copySync(this.outputDir, this.cachedOutputInNewRenderDir);
        this.safeCopyToMachineCache(this.outputDir);
    }

    private safeCopyToMachineCache(src: string) {
        // This process can be killed at any time. If we were copying to the machine cache as the kill happened, the machine cache directory would have
        // partial data in it. That data would then get used for subsequent renders, meaning you'd see a bad output (partial output).
        //
        // To avoid this problem, this method copies first to a tmp dir, then RENAMES that the machine cache dir. It should be an atomic operation (I hope).
        //
        // If this doesn't work, the only other solution is to hash the contents of the directory and store it WITH the directory. When reading the
        // contents of the directory, you'd have to first hash it and compare it with the hash that's there to make sure its the same. If it isn't the same,
        // the machine cache directory is no good (replace it). The same if the hash isn't there -- the machine directory is no good (replace it).
        //
        // If that doesn't work either, then the idea of the machine cache needs to go away. You'll just have to re-process the output if it goes away
        // in a render then gets subsequently introduced again in a future render.
        if (FileSystem.existsSync(this.cachedOutputInMachineDir)) {
            return;
        }
        const tmpDir = FileSystem.mkdtempSync('temp-dir-destined-for-machine-cache');
        FileSystem.copySync(src, tmpDir);
        FileSystem.renameSync(tmpDir, this.cachedOutputInMachineDir);
    }

    private initializeContainer() {
        const envDir = this.containerDir;
        if (Podman.existsImage(envDir, this.containerHash)) {
            return;
        }

        console.log(`Initializing ${this.friendlyName} container (may take several minutes)`);

        FileSystem.copySync(this.setupDir, envDir);
        Podman.createImageRaw(envDir, this.containerHash);
    }

    private launchContainer() {
        console.log(`Launching ${this.friendlyName} container`);

        const envDir = this.containerDir;
        const volumeMappings = [
            new Podman.LaunchVolumeMapping(this.inputDir, '/input', 'r'),
            new Podman.LaunchVolumeMapping(this.outputDir, '/output', 'rw')            
        ];
        const environmentVariables: Podman.EnvironmentVariable[] = [
            // new Podman.EnvironmentVariable('__UNIQUE_INPUT_ID', this.friendlyName + '_' + this.dataHash)
        ];
        // SHOULD BE PASSING INPUT ID AS AN ENV VAR BUT THE VERSION OF Podman IS TOO OLD TO SUPPORT IT (--env flag missing). REVISIT LATER.
        FileSystem.writeFileSync(
            this.inputDir + '/' + this.hashFilename,
            this.friendlyName + '_' + this.dataHash,
            {
                encoding: 'utf-8',
                flag: 'wx'  // write but don't overwrite
            }
        );
        Podman.launchContainer(
            envDir,
            this.containerHash,
            ['sh', '/_macro/run.sh'],
            {
                volumeMappings: volumeMappings,
                environmentVariables: environmentVariables
            }
        );
    }
}

// children of dir are relativized prior to hashing (dir is stripped off of children before hashing)
function hashDirectory(hasher: Crypto.Hash, dir: string) {
    if (!Path.isAbsolute(dir)) {
        throw new Error(`${dir} is not absolute`);
    }
    dir = Path.normalize(dir);
    const children = listDirectory(dir);
    for (const path of children) {
        const lstat = FileSystem.lstatSync(path);
        const relPath = Path.relative(dir, path);
        if (lstat.isDirectory()) {
            hasher.update('dir', 'utf8');
            hasher.update(relPath, 'utf8');
        } else if (lstat.isFile()) {
            hasher.update('file', 'utf8');
            hasher.update('path' + relPath, 'utf8');
            hasher.update('size' + lstat.size, 'utf8');
            hasher.update(FileSystem.readFileSync(path));
        } else {
            throw new Error('Unrecognized path type: ' + JSON.stringify(lstat));
        }
    }
}

function listDirectory(dir: string) {
    const paths = listDirectoryInternal(dir);
    paths.sort();
    return paths;
}

function listDirectoryInternal(dir: string): string[] {
    const dirChildren = FileSystem.readdirSync(dir)
        .map(c => Path.resolve(dir, c));
    const dirChildrenChildren = dirChildren
        .filter(c => FileSystem.lstatSync(c).isDirectory())
        .map(c => listDirectoryInternal(c))
        .reduceRight((p, c) => c.concat(p), []);
    const allChildren = dirChildren.concat(dirChildrenChildren);
    return allChildren;
}