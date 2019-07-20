import FileSystem from 'fs-extra';
import * as Buildah from './buildah';

test('must check version', () => {
    Buildah.buildahVersionCheck();
});

test('must create and run container', () => {
    const tempPath = FileSystem.mkdtempSync('/tmp/containertest');

    // create container
    const tempEnvFile = tempPath + '/container.tar.gz';
    Buildah.createContainer('FROM alpine:3.7', [], 'container', tempEnvFile);

    // run container
    try {
        FileSystem.mkdirpSync(tempPath + '/input');
        FileSystem.mkdirpSync(tempPath + '/output');
        FileSystem.writeFileSync(tempPath + '/input/script.sh', 'echo hello world! > /data/output/out.txt', { encoding: 'utf8' });

        Buildah.launchContainer(tempEnvFile, 'container', tempPath + '/input', tempPath + '/output', ['sh', '/data/input/script.sh']);
        const output = FileSystem.readFileSync(tempPath + '/output/out.txt', { encoding: 'utf8' });
        expect(output).toBe('hello world!\n');
    } finally {
        FileSystem.removeSync(tempPath);
    }
});


test('must create and run container, but subsequent launches should happen much faster', () => {
    const tempPath = FileSystem.mkdtempSync('/tmp/containertest');
    const cacheDir = FileSystem.mkdtempSync('/tmp/containertestcache');

    // create container
    const tempEnvFile = tempPath + '/container.tar.gz';
    Buildah.createContainer('FROM alpine:3.7', [], 'container', tempEnvFile);

    // run container
    try {
        FileSystem.mkdirpSync(tempPath + '/input');
        FileSystem.mkdirpSync(tempPath + '/output');
        FileSystem.writeFileSync(tempPath + '/input/script.sh', 'echo hello world! > /data/output/out.txt', { encoding: 'utf8' });

        // initial run should be slow
        const run1Start = new Date().getTime();
        Buildah.launchContainer(tempEnvFile, 'container', tempPath + '/input', tempPath + '/output', ['sh', '/data/input/script.sh'], { cacheDir : cacheDir });
        const run1End = new Date().getTime();
        const output1 = FileSystem.readFileSync(tempPath + '/output/out.txt', { encoding: 'utf8' });
        expect(output1).toBe('hello world!\n');

        // subsequen run should be much faster because it won't actually run -- it returns the first runs cached result
        const run2Start = new Date().getTime();
        Buildah.launchContainer(tempEnvFile, 'container', tempPath + '/input', tempPath + '/output', ['sh', '/data/input/script.sh'], { cacheDir : cacheDir });
        const run2End = new Date().getTime();
        const output2 = FileSystem.readFileSync(tempPath + '/output/out.txt', { encoding: 'utf8' });
        expect(output2).toBe('hello world!\n');

        // check
        const run1Length = run1End - run1Start;
        const run2Length = run2End - run2Start;
        expect(run2Length).toBeLessThan(run1Length);
    } finally {
        FileSystem.removeSync(tempPath);
    }
});


// test('generate plantuml container', () => {
//     const tempPath = FileSystem.mkdtempSync('/tmp/containertest');
    
//     // create container
//     const tempEnvFile = tempPath + '/container.tar.gz';
//     Buildah.createContainer(
//         'FROM alpine:3.10\n'
//         + 'RUN apk add --no-cache openjdk11-jre\n'          // jre-headless won't work -- it fails when running plantuml (regardless of if the -Djava.awt.headless=true is present)
//         + 'RUN apk add --no-cache fontconfig ttf-dejavu\n'  // without these packages, plantuml fails with font related exception
//         + 'RUN mkdir -p /opt\n'
//         + 'COPY plantuml.1.2019.7.jar /opt/\n',
//         [ 'resources/plantuml.1.2019.7.jar' ],
//         'container',
//         tempEnvFile
//     );

//     // run container
//     FileSystem.mkdirpSync(tempPath + '/input');
//     FileSystem.mkdirpSync(tempPath + '/output');
//     FileSystem.writeFileSync(
//         tempPath + '/input/diagram.puml',
//         '@startuml\n'
//         + 'Alice -> Bob: Authentication Request\n'
//         + 'Bob --> Alice: Authentication Response\n'
//         + '\n'
//         + 'Alice -> Bob: Another authentication Request\n'
//         + 'Alice <-- Bob: Another authentication Response\n'
//         + '@enduml\n'
//     );
//     FileSystem.writeFileSync(
//         tempPath + '/input/script.sh',
//         'java -Djava.awt.headless=true -jar /opt/plantuml.1.2019.7.jar -tsvg /data/input/diagram.puml\n'
//         + 'mv /data/input/diagram.svg /data/output\n'
//     );

//     Buildah.launchContainer(tempEnvFile, 'container', tempPath + '/input', tempPath + '/output', ['sh', '/data/input/script.sh']);
//     const output = FileSystem.readFileSync(tempPath + '/output/diagram.svg', { encoding: 'utf8' });
//     console.log(output);

//     FileSystem.copySync(tempEnvFile, 'resources/plantuml_container.tar.gz');
// });