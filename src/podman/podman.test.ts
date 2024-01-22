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
        FileSystem.removeSync(envPath);
    }
});


// test('generate plantuml container', () => {
//     const envPath = FileSystem.mkdtempSync('/tmp/container');
//     const dataPath = FileSystem.mkdtempSync('/tmp/container_data');
    
//     // create container
//     podman.createContainer(
//         envPath,
//         'testcontainer',
//         'FROM alpine:3.10\n'
//         + 'RUN apk add --no-cache openjdk11-jre\n'          // jre-headless won't work -- it fails when running plantuml (regardless of if the -Djava.awt.headless=true is present)
//         + 'RUN apk add --no-cache fontconfig ttf-dejavu\n'  // without these packages, plantuml fails with font related exception
//         + 'RUN apk add --no-cache graphviz\n'               // without these packages, plantuml fails on some graphs (dot required)
//         + 'RUN apk add --no-cache wget\n'                   // install temporarily so we can download plantuml
//         + 'RUN mkdir -p /opt\n'
//         + 'WORKDIR /opt\n'
//         + 'RUN wget https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2019.8/plantuml-1.2019.8.jar\n'
//         + 'RUN apk del --no-cache wget\n',
//         []
//     );

//     // run container
//     FileSystem.mkdirpSync(dataPath + '/input');
//     FileSystem.mkdirpSync(dataPath + '/output');
//     FileSystem.writeFileSync(
//         dataPath + '/input/diagram.puml',
//         '@startuml\n'
//         + 'Alice -> Bob: Authentication Request\n'
//         + 'Bob --> Alice: Authentication Response\n'
//         + '\n'
//         + 'Alice -> Bob: Another authentication Request\n'
//         + 'Alice <-- Bob: Another authentication Response\n'
//         + '@enduml\n'
//     );
//     FileSystem.writeFileSync(
//         dataPath + '/input/script.sh',
//         'java -Djava.awt.headless=true -jar /opt/plantuml-1.2019.8.jar -tsvg /input/diagram.puml\n'
//         + 'mv /input/diagram.svg /output\n'
//     );

//     podman.launchContainer(envPath, 'testcontainer', dataPath + '/input', dataPath + '/output', ['sh', '/input/script.sh']);
//     const output = FileSystem.readFileSync(dataPath + '/output/diagram.svg', { encoding: 'utf8' });
//     console.log(output);
// });