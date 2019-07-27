import * as Process from 'process';
import * as ChildProcess from 'child_process';

export interface ProcessInfo {
    pid: string,
    ppid: string
}

export function listProcesses(): ProcessInfo[] {
    const psRet = ChildProcess.spawnSync('ps', ['--no-header', '-o', 'pid:1,ppid:1', '-A']);
    if (psRet.status !== 0) {
        throw new Error('Failed to run ps: ' + JSON.stringify(psRet));
    }

    const stdout = psRet.stdout.toString();
    const lines = stdout.split(/[\r\n]+/);
    const splitPidAndPpid = lines.map(l => l.split(/\s/));

    return splitPidAndPpid.map(l => ({ pid: l[0], ppid: l[1] }));
}





export interface ProcessHierarchy {
    pid: string,
    children: ProcessHierarchy[]
}

export function getProcessHierarchy(ppid: string) {
    const processes = listProcesses();
    return internalGetProcessHierarchy(ppid, processes);
}

function internalGetProcessHierarchy(ppid: string, procList: ProcessInfo[]): ProcessHierarchy {
    const foundChildPids = procList
        .filter(o => o.ppid === ppid)
        .map(o => internalGetProcessHierarchy(o.pid, procList))
        .filter(o => o !== undefined)
        .map(o => o as ProcessHierarchy);

    return {
        pid: ppid,
        children: foundChildPids
    };
}





export function killProcessHierarchy(pid: string) {
    const hierarchy = getProcessHierarchy(pid);
    killChildrenRecursive(hierarchy);
}

function killChildrenRecursive(processHierarchy: ProcessHierarchy) {
    // kill children
    processHierarchy.children.forEach(c => killChildrenRecursive(c));
    // kill process
    const pidAsNum = Number.parseInt(processHierarchy.pid);
    try {
        Process.kill(pidAsNum, 'SIGKILL');
    } catch (e) {
        // ignore -- will throw an exception if pid exit before we get to killing it
    }

    // ensure that any new child processes get killed (child processed started inbetween the time we were killing children and killing the parent process)
    const newChildren = getProcessHierarchy(processHierarchy.pid).children;
    newChildren.forEach(c => killChildrenRecursive(c));
}