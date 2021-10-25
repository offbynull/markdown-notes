import FileSystem from 'fs-extra';
import { ContainerHelper } from './container_helper';

test('must create and run container', () => {
    const machineCacheDir = FileSystem.mkdtempSync('/tmp/machineCache');
    const oldLocalCacheDir = FileSystem.mkdtempSync('/tmp/oldLocalCache');
    const newLocalCacheDir = FileSystem.mkdtempSync('/tmp/newLocalCache');
    const envDir = FileSystem.mkdtempSync('/tmp/container');
    const dataDir = FileSystem.mkdtempSync('/tmp/container_data');
    const inputDir = dataDir + '/input';
    const outputDir = dataDir + '/output';

    FileSystem.writeFileSync(envDir + '/Dockerfile', 'FROM alpine:3.10\nRUN apk add --no-cache bash\n');

    FileSystem.mkdirpSync(inputDir);
    FileSystem.mkdirpSync(outputDir);
    FileSystem.writeFileSync(inputDir + '/run.sh', 'echo hello world! > /output/out.data');

    const helper = new ContainerHelper('test_container', envDir, inputDir, outputDir, machineCacheDir, oldLocalCacheDir, newLocalCacheDir);
    helper.run();

    const output = FileSystem.readFileSync(outputDir + '/out.data', { encoding: 'utf8' });
    expect(output).toBe('hello world!\n');
});