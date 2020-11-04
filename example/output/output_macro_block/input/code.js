const fs = require('fs');
const cp = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
try {
    for (const requiredModule of Object.keys(packageJson.dependencies)) {
        require(requiredModule)
    }
} catch (e) {
    cp.execSync('npm install', { stdio: [0, 1, 2] });
}


function getStartingSpaceCount(input/*: string*/) {
    let startLine = true;
    let startSpace = 0;
    const startSpaces/*: number[]*/ = [];
    for (let i = 0; i < input.length; i++) {
        const element = input[i];
        if (startLine) {
            if (element === ' ') {
                startSpace += 1;
            } else if (element === '\n') {
                startSpace = 0;
            } else {
                startLine = false;
                startSpaces.push(startSpace);
            }
        } else {
            if (element === '\n') {
                startSpace = 0;
                startLine = true;
            }
        }
    }
    
    // add startSpace for last line if last line not empty
    if (startLine === false) {
      startSpaces.push(startSpace);
    }

    const minStartSpace = Math.min(...startSpaces);
    return minStartSpace === Infinity ? 0 : minStartSpace;
}

function knockback(input/*: string*/, count/*: number*/) {
    let output = '';
    let chompsRemaining = count;
    for (let i = 0; i < input.length; i++) {
        const element = input[i];
        if (element === '\n') {
            chompsRemaining = count;
            output += element;
        } else {
            if (chompsRemaining > 0) {
                chompsRemaining -= 1;
            } else {
                output += element;
            }
        }
    }
    return output;
}

let filePath = fs.readFileSync('/input/input.files', 'utf8').trim();
if (filePath.split('\n').length === 0) {
    throw Error('No image file specified');
} else if (filePath.split('\n').length > 1) {
    throw Error('Too many image files specified');
}
filePath = '/input/' + filePath;

const content = fs.readFileSync('/input/input.data', 'utf8').trim();
const lines = content.split(/[\r\n]/g);

const lang = lines.length < 1 ? '' : lines[0];
const regex = lines.length < 2 ? /^([\s\S]*)$/  : new RegExp(lines[1], '');
if (/^{.*}$/.exec(lang) !== null) {
    throw Error(`The language specified cannot be wrapped in curly braces: ${lang}`);
}

let data = fs.readFileSync(filePath, 'UTF-8');
                
const isolation = regex.exec(data);
if (isolation === null) {
    throw new Error(`Isolation regex ${regex} does not match file data ${path}`);
}
if (isolation[1] === undefined) {
    throw new Error(`Isolation regex ${regex} did not extract group 1 from data ${path}`);
}
data = isolation[1];

const trimCount = getStartingSpaceCount(data);
data = knockback(data, trimCount);

const ret = '```' + lang + '\n' + data + '\n```';
fs.writeFileSync('/output/output.md', ret, { encoding: 'utf8' });