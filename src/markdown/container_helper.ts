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

function runContainer(
    friendlyName: string,
    containerDir: string,
    inputDir: string,
    inputOverrides: Map<string, string | Buffer>,
    outputDir: string,
    extraVolumeMappings: Buildah.LaunchVolumeMapping[],
    cacheDir: string) {
    if (inputOverrides.size !== 0) {
        FileSystem.mkdtempSync('inputoverrides');
        for (const e of inputOverrides.entries()) {
            const overridePath = Path.normalize(Path.resolve(inputDir, e[0]));
            if (Path.relative(overridePath, inputDir).startsWith('..')) {
                throw new Error(`Cannot inject outside of input directory: ${e[0]} vs ${inputDir}`);
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
    }
    return new ContainerHelper(friendlyName, containerDir, inputDir, outputDir, cacheDir).run(extraVolumeMappings);
}

export class ContainerHelper {
    private readonly containerHash: string;
    private readonly dataHash: string;
    constructor(
        private readonly friendlyName: string,
        private readonly containerDir: string,
        private readonly inputDir: string,
        private readonly outputDir: string,
        private readonly cacheDir: string
    ) {
        this.containerHash = hashDirectories([ containerDir ]);
        this.dataHash = hashDirectories([ containerDir, inputDir ]);
    }

    public run(extraVolumeMappings?: Buildah.LaunchVolumeMapping[]) {
        this.initializeContainer();
        if (this.isAlreadyProcessed()) {
            return;
        }
        this.launchContainer(extraVolumeMappings || []);
    }

    private initializeContainer() {
        const envDir = Path.resolve(this.cacheDir, this.containerHash + '_macro_env');
        if (Buildah.existsContainer(envDir, this.containerHash)) {
            return;
        }

        console.log(`Initializing ${this.friendlyName} container (may take several minutes)`);

        FileSystem.copySync(this.containerDir, envDir);
        Buildah.createContainerRaw(envDir, this.friendlyName);
    }

    private launchContainer(extraVolumeMappings: Buildah.LaunchVolumeMapping[]) {
        console.log(`Launching ${this.friendlyName} container`);

        const scriptFile = Path.resolve(this.inputDir, 'run.sh');
        if (!FileSystem.existsSync(scriptFile) || !FileSystem.lstatSync(scriptFile).isFile()) {
            throw new Error('Missing run.sh');
        }

        const envDir = Path.resolve(this.cacheDir, this.containerHash + '_macro_env');
        const volumeMappings = [
            new Buildah.LaunchVolumeMapping(this.inputDir, '/input', 'r'),
            new Buildah.LaunchVolumeMapping(this.outputDir, '/output', 'rw')            
        ];
        volumeMappings.concat(extraVolumeMappings);
        Buildah.launchContainer(
            envDir,
            this.friendlyName,
            ['bash', '/input/run.sh'],
            {
                volumeMappings: volumeMappings
            }
        );
    }

    private isAlreadyProcessed() {
        const outDir = Path.resolve(this.cacheDir, this.containerHash + '_macro_output');
        if (!FileSystem.existsSync(outDir)) {
            return false;
        }

        if (!FileSystem.lstatSync(outDir).isDirectory()) {
            throw new Error('Non-directory exists for cached output? ' + outDir);
        }

        return true;
    }
}

function hashDirectories(dirs: string[]) {
    const hasher = Crypto.createHash('md5');
    for (const dir of dirs) {
        const children = listDirectory(dir);
        for (const path of children) {
            const lstat = FileSystem.lstatSync(path);
            if (lstat.isDirectory()) {
                hasher.update('dir', 'utf8');
                hasher.update(path, 'utf8');
            } else if (lstat.isFile()) {
                hasher.update('file', 'utf8');
                hasher.update('path' + path, 'utf8');
                hasher.update('size' + lstat.size, 'utf8');
                hasher.update(FileSystem.readFileSync(path));
            } else {
                throw new Error('Unrecognized path type: ' + JSON.stringify(lstat));
            }
        }
    }
    return hasher.digest('base64');
}

function listDirectory(dir: string) {
    const dirChildren = FileSystem.readdirSync(dir)
        .map(c => Path.resolve(dir, c));
    const dirChildrenChildren = dirChildren
        .filter(c => FileSystem.lstatSync(c).isDirectory())
        .map(c => listDirectory(c))
        .reduceRight((p, c) => c.concat(p), []);
    dirChildren.concat(dirChildrenChildren);
    return dirChildren;
}