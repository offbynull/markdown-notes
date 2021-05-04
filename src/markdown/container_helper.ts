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
import * as Buildah from '../buildah/buildah';

export function runContainer(
    friendlyName: string,
    containerDir: string,
    inputDir: string,
    inputOverrides: Map<string, string | Buffer>,
    outputDir: string,
    extraVolumeMappings: Buildah.LaunchVolumeMapping[],
    cacheDir: string
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
        containerDir,
        inputDir,
        outputDir,
        cacheDir
    );

    // Has there been a previous run of this container for this specific input?
    if (ch.isAlreadyProcessed()) { // If so, use the cached output
        outputDir = ch.cachedOutputDir;
    } else { // If not, run container
        ch.run(extraVolumeMappings);
    }

    // Remove tmp directory if it was created
    if (tmpDir !== null) {
        FileSystem.removeSync(tmpDir);
    }

    return { updatedInputDir: inputDir, updatedOutputDir: outputDir, finalCacheDir: ch.cachedOutputDir };
}

export class ContainerHelper {
    private readonly containerHash: string;
    public readonly dataHash: string;
    public readonly cachedContainerDir: string;
    public readonly cachedOutputDir: string;
    constructor(
        private readonly friendlyName: string,
        private readonly containerDir: string,
        private readonly inputDir: string,
        private readonly outputDir: string,
        private readonly cacheDir: string
    ) {
        const containerHasher = Crypto.createHash('md5');
        hashDirectory(containerHasher, containerDir);
        this.containerHash = containerHasher.digest('hex');

        const dataHasher = Crypto.createHash('md5');
        dataHasher.update('container');
        dataHasher.update(this.containerHash);
        dataHasher.update('data');
        hashDirectory(dataHasher, inputDir);
        this.dataHash = dataHasher.digest('hex');

        this.cachedOutputDir = Path.resolve(this.cacheDir, 'container_output_' + this.dataHash);
        this.cachedContainerDir = Path.resolve(this.cacheDir, 'container_env_' + this.containerHash);
    }

    public run(extraVolumeMappings?: Buildah.LaunchVolumeMapping[]) {
        if (this.isAlreadyProcessed()) {
            return;
        }
        this.initializeContainer();
        this.launchContainer(extraVolumeMappings || []);
    }

    private initializeContainer() {
        const envDir = this.cachedContainerDir;
        if (Buildah.existsContainer(envDir, this.containerHash)) {
            return;
        }

        console.log(`Initializing ${this.friendlyName} container (may take several minutes)`);

        FileSystem.copySync(this.containerDir, envDir);
        Buildah.createContainerRaw(envDir, this.containerHash);
    }

    private launchContainer(extraVolumeMappings: Buildah.LaunchVolumeMapping[]) {
        if (this.isAlreadyProcessed()) {
            return;
        }

        console.log(`Launching ${this.friendlyName} container`);

        const scriptFile = Path.resolve(this.inputDir, 'run.sh');
        if (!FileSystem.existsSync(scriptFile) || !FileSystem.lstatSync(scriptFile).isFile()) {
            throw new Error('Missing run.sh');
        }

        const envDir = this.cachedContainerDir;
        const volumeMappings = [
            new Buildah.LaunchVolumeMapping(this.inputDir, '/input', 'r'),
            new Buildah.LaunchVolumeMapping(this.outputDir, '/output', 'rw')            
        ].concat(extraVolumeMappings);
        Buildah.launchContainer(
            envDir,
            this.containerHash,
            ['sh', '/input/run.sh'],
            {
                volumeMappings: volumeMappings
            }
        );

        FileSystem.copySync(this.outputDir, this.cachedOutputDir)
    }

    public isAlreadyProcessed() {
        const outDir = this.cachedOutputDir;
        if (!FileSystem.existsSync(outDir)) {
            return false;
        }

        if (!FileSystem.lstatSync(outDir).isDirectory()) {
            throw new Error('Non-directory exists for cached output? ' + outDir);
        }

        return true;
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