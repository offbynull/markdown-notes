import FileSystem from 'fs-extra';
import Markdown from "./markdown";

let tempRenderPath = '';
let inputPath = '';
let machineCachePath = '';
let oldLocalCachePath = '';
let newLocalCachePath = '';

beforeEach(() => {
    tempRenderPath = FileSystem.mkdtempSync('/tmp/render');
    inputPath = FileSystem.mkdtempSync('/tmp/input');
    machineCachePath = FileSystem.mkdtempSync('/tmp/machineCache');
    oldLocalCachePath = FileSystem.mkdtempSync('/tmp/oldLocalCache');
    newLocalCachePath = FileSystem.mkdtempSync('/tmp/newLocalCache');
});

afterEach(() => {
    FileSystem.removeSync(tempRenderPath);
    FileSystem.removeSync(inputPath);
    FileSystem.removeSync(machineCachePath);
});

test('must run conda', () => {
    const md = new Markdown(machineCachePath, oldLocalCachePath, newLocalCachePath, inputPath, '', tempRenderPath, []);
    const output = md.render(
        `
\`\`\`{conda}
dependencies:
  - python=3.4
----
f = open("/output/text.txt","w+")
f.write("hello world!")
f.close()
\`\`\`
        `
    );

    console.log(output);
})