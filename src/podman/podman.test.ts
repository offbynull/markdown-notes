import FileSystem from 'fs-extra';
import * as Podman from './podman';

test('must check version', () => {
    Podman.podmanVersionCheck();
});

test('must create and run container', () => {
    const envPath = FileSystem.mkdtempSync('/tmp/container');
    const dataPath = FileSystem.mkdtempSync('/tmp/container_data');

    // create container
    Podman.createImage(envPath, 'testcontainer', 'FROM alpine:3.7', []);

    // run container
    try {
        FileSystem.mkdirpSync(dataPath + '/input');
        FileSystem.mkdirpSync(dataPath + '/output');
        FileSystem.writeFileSync(dataPath + '/input/script.sh', 'echo hello world! > /output/out.txt', { encoding: 'utf8' });

        Podman.launchContainer(envPath, 'testcontainer', ['sh', '/input/script.sh'],
            {
                volumeMappings: [
                    new Podman.LaunchVolumeMapping(dataPath + '/input', '/input', 'rw'),
                    new Podman.LaunchVolumeMapping(dataPath + '/output', '/output', 'rw')
                ]
            }
        );
        const output = FileSystem.readFileSync(dataPath + '/output/out.txt', { encoding: 'utf8' });
        expect(output).toBe('hello world!\n');
    } finally {
        Podman.removeAll(envPath);  // Without this line, the line below it will error out with a permission issue
        FileSystem.removeSync(envPath);
    }
});