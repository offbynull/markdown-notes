import FileSystem from 'fs-extra';
import Markdown from "./markdown";

let tempRenderPath = '';
let inputPath = '';
let cachePath = '';

beforeEach(() => {
    tempRenderPath = FileSystem.mkdtempSync('/tmp/render');
    inputPath = FileSystem.mkdtempSync('/tmp/input');
    cachePath = FileSystem.mkdtempSync('/tmp/cache');
});

afterEach(() => {
    FileSystem.removeSync(tempRenderPath);
    FileSystem.removeSync(inputPath);
    FileSystem.removeSync(cachePath);
});

test('must run conda', () => {
    const md = new Markdown(cachePath, inputPath, '', tempRenderPath, []);
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