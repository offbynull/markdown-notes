import * as Process from 'process';
import * as ChildProcess from 'child_process';
import { listProcesses, getProcessHierarchy, killProcessHierarchy } from "./process_utils";

test('must list all processes', () => {
    const pids = listProcesses();

    const pidToFind = Process.pid;
    const len = pids.filter(o => o.pid === '' + pidToFind).length;

    expect(len).not.toBe(0);
});

test('must report children', () => {
    const rootPid = ChildProcess.spawn('timeout', ['1', 'bash']).pid;

    const hierarchy = getProcessHierarchy('' + rootPid);
    expect(hierarchy.children.length).not.toBe(0);
});

test('must kill children', () => {
    const child = ChildProcess.spawn('timeout', ['5', 'bash']);
    const rootPid = child.pid;

    const hierBefore = getProcessHierarchy('' + rootPid);
    expect(hierBefore.children.length).toBe(1);

    killProcessHierarchy('' + rootPid);
    child.kill('SIGKILL'); // we need to forcefull end the process here, otherwise it'll just get listed as defunct by ps and still show up in the list
                           // ... but doing this won't kill the child processes, so the test below is still valid

    const hierAfter = getProcessHierarchy('' + rootPid); // treats rootPid as a ppid -- doesn't check that ppid exists, only looks for its children
    expect(hierAfter.children.length).toBe(0);
});