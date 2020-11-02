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

export interface MacroDefinition {
    readonly name: string;
    readonly type: MacroType;
    readonly directory: string; // macro directory (relative to root markdown input directory)
    readonly inputOverridePaths: string[]; // paths to copy over as macro inputs (relative to root markdown input directory)
    readonly inputOverridePathsPrefix: string | undefined; // starting lines in the macro text prefixed with this are considered as paths to copy over as macro inputs (relative to root markdown input directory)
}

export enum MacroType {
    BLOCK,
    INLINE,
    ALL // means both block and inline
}

export function macroScan(dir: string): MacroDefinition[] {
    const ret: MacroDefinition[] = [];

    const childDirs = FileSystem.readdirSync(dir)
        .filter(c => FileSystem.lstatSync(Path.resolve(dir, c)).isDirectory());
    for (const childDir of childDirs) {
        const scanRes = childDir.match(/^(.*)_macro_(block|inline|all)$/);
        if (scanRes === null) {
            continue;
        }

        const name = scanRes[1];
        if (/^[a-z0-9]+$/i.test(name) === false) {
            throw new Error('Macro definition name must contain 1 or more alphanumeric characters: ' + name)
        }
        macroDirectoryCheck(dir, childDir);

        const type = (() => {
            switch (scanRes[2]) {
                case 'block':
                    return MacroType.BLOCK;
                case 'inline':
                    return MacroType.INLINE;
                case 'all':
                    return MacroType.ALL;
                default:
                    throw Error('Unrecognized macro type: ' + scanRes[1]);
            }
        })();

        const settings = parseSettingsFile(Path.resolve(dir, childDir, 'settings.json'));

        ret.push({
            name: name,
            type: type,
            directory: childDir,
            inputOverridePaths: settings.copyInputs,
            inputOverridePathsPrefix: settings.copyInputsPrefix
        })
    }

    return ret;
}

export function macroDirectoryCheck(parentDir: string, dir: string) {
    if (dir.length === 0) {
        throw new Error('Path cannot be empty');
    }
    dir = Path.resolve(parentDir, dir);

    const containerSetupDir = Path.resolve(dir, 'container');
    const containerInputDir = Path.resolve(dir, 'input');
    const containerRunnerScriptFile = Path.resolve(containerInputDir, 'run.sh');
    if (!FileSystem.existsSync(dir) || !FileSystem.lstatSync(dir).isDirectory()) {
        throw new Error(`Macro dir missing: ${dir}`);
    }
    if (!FileSystem.existsSync(containerSetupDir) || !FileSystem.lstatSync(containerSetupDir).isDirectory()) {
        throw new Error(`Macro container setup dir missing: ${containerSetupDir}`);
    }
    if (!FileSystem.existsSync(containerInputDir) || !FileSystem.lstatSync(containerInputDir).isDirectory()) {
        throw new Error(`Macro input dir missing: ${containerInputDir}`);
    }
    if (!FileSystem.existsSync(containerRunnerScriptFile) || !FileSystem.lstatSync(containerRunnerScriptFile).isFile()) {
        throw new Error(`Macro run script missing: ${containerRunnerScriptFile}`);
    }
 
    const macroSettingsFile = Path.resolve(dir, 'settings.json');
    if (!FileSystem.existsSync(macroSettingsFile) || !FileSystem.lstatSync(macroSettingsFile).isFile()) {
        throw new Error(`Macro settings missing: ${macroSettingsFile}`);
    }
    parseSettingsFile(macroSettingsFile);
 
    return {
        containerSetupDir: containerSetupDir,
        containerInputDir: containerInputDir,
        containerRunnerScriptFile: containerRunnerScriptFile,
        macroSettingsFile: macroSettingsFile
    }
}

function parseSettingsFile(settingsFile: string) {
    const settingsObj = FileSystem.readJsonSync(settingsFile, { encoding: 'UTF8' })
    if (typeof settingsObj !== 'object') {
        throw new Error('Expected JSON object in settings file: ' + JSON.stringify(settingsObj));
    }

    const unknownKeys = Object.keys(settingsObj).filter(e => e !== 'copyInputs' && e !== 'copyInputsPrefix');
    if (unknownKeys.length > 0) {
        throw new Error('Unexpected keys in JSON object: ' + JSON.stringify(settingsObj));
    }

    const settingsCopyInputsArr = settingsObj['copyInputs'] || [];
    if (!Array.isArray(settingsCopyInputsArr) || (settingsCopyInputsArr as String[]).filter(x => typeof x !== 'string').length > 0) {
        throw new Error('Expected a copyInputs setting of type String[]: ' + JSON.stringify(settingsObj));
    }

    const settingsCopyInputsPrefixStr = settingsObj['copyInputsPrefix']; // may be undefined
    if (typeof settingsCopyInputsPrefixStr !== 'string' && typeof settingsCopyInputsPrefixStr !== 'undefined') {
        throw new Error('Expected a copyInputsPrefix of undefined or string: ' + JSON.stringify(settingsObj));
    }

    return {
        copyInputs: settingsCopyInputsArr as string[],
        copyInputsPrefix: settingsCopyInputsPrefixStr
    }
}