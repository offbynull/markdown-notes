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


const FileSystem = require('fs-extra');
const Crypto = require('crypto');
const ImageUtils = require('./image_utils');

function processImage(srcImgData, content) {
    const lines = content.split(/[\r\n]/g);
    if (lines.length < 2) {
        throw new Error('Require at least 2 lines for images: alternative text, title');
    }

    const altText = lines[1];
    const title = lines[2]; // this is where attribution goes

    let svgData = ImageUtils.wrapAsSvg(srcImgData);

    let bgColor = '#7f7f7fff';
    let fgColor = '#000000ff';
    let fontSize = 16;
    let strokeWidth = 6;
    for (let i = 3; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length === 0) {
            continue;
        }

        const command = (() => {
            const split = line.split(/\s+/, 2);
            if (split === undefined || split.length < 1) {
                throw new Error('Command missing');
            }
            return split[0].toLowerCase();
        })();

        switch (command) {
            case 'bg_color': {
                const params = line.split(/\s+/, 2);
                if (params.length !== 2) {
                    throw new Error(`bad params -- bg_color html_color_code: ${line}`);
                }
                ImageUtils.validateColorValue(params[1]);
                bgColor = params[1];
                break;
            }
            case 'fg_color': {
                const params = line.split(/\s+/, 2);
                if (params.length !== 2) {
                    throw new Error(`bad params -- fg_color html_color_code: ${line}`);
                }
                ImageUtils.validateColorValue(params[1]);
                fgColor = params[1];
                break;
            }
            case 'font_size': {
                const params = line.split(/\s+/, 2);
                if (params.length !== 2) {
                    throw new Error(`bad params -- font_size size: ${line}`);
                }
                const newFontSize = parseFloat(params[1]);
                if (isNaN(newFontSize)) {
                    throw new Error(`size param cannot be parsed as float: ${line}`);
                }
                fontSize = newFontSize;
                break;
            }
            case 'stroke': {
                const params = line.split(/\s+/, 2);
                if (params.length !== 2) {
                    throw new Error(`bad params -- stroke_size size: ${line}`);
                }
                const newStrokeWidth = parseFloat(params[1]);
                if (isNaN(newStrokeWidth)) {
                    throw new Error(`width param cannot be parsed as float: ${line}`);
                }
                strokeWidth = newStrokeWidth;
                break;
            }
            case 'scale': {
                const params = line.split(/\s+/, 3);
                if (params.length !== 3) {
                    throw new Error(`bad params -- scale x_scale y_scale: ${line}`);
                }
                const xScale = parseFloat(params[1]);
                const yScale = parseFloat(params[2]);
                if (isNaN(xScale) || isNaN(yScale)) {
                    throw new Error(`s_scale/y_scale param cannot be parsed as float: ${line}`);
                }

                svgData = ImageUtils.scaleAsSvg(svgData, xScale, yScale);
                break;
            }
            case 'expand': {
                const params = line.split(/\s+/, 5);
                if (params.length !== 5) {
                    throw new Error(`Bad params -- expand new_width new_height x_offset y_offset: ${line}`);
                }
                const newWidth = parseFloat(params[1]);
                const newHeight = parseFloat(params[2]);
                const xOffset = parseFloat(params[3]);
                const yOffset = parseFloat(params[4]);
                if (isNaN(newWidth) || isNaN(newHeight) || isNaN(xOffset) || isNaN(yOffset)) {
                    throw new Error(`new_width/new_height/x_offset/y_offset param cannot be parsed as float: ${line}`);
                }

                svgData = ImageUtils.expandAsSvg(svgData, newWidth, newHeight, xOffset, yOffset);
                break;
            }
            case 'crop': {
                const params = line.split(/\s+/, 5);
                if (params.length !== 5) {
                    throw new Error(`bad params -- crop x_offset y_offset new_width new_height: ${line}`);
                }
                const xOffset = parseFloat(params[1]);
                const yOffset = parseFloat(params[2]);
                const newWidth = parseFloat(params[3]);
                const newHeight = parseFloat(params[4]);
                if (isNaN(xOffset) || isNaN(yOffset) || isNaN(newWidth) || isNaN(newHeight)) {
                    throw new Error(`x_offset/y_offset/new_width/new_height param cannot be parsed as float: ${line}`);
                }

                svgData = ImageUtils.cropAsSvg(svgData, xOffset, yOffset, newWidth, newHeight);
                break;
            }
            case 'rect': {
                const params = line.split(/\s+/);
                if (params.length !== 5) {
                    throw new Error(`Bad params -- rect x_offset y_offset width height: ${line}`);
                }
                const xOffset = parseFloat(params[1]);
                const yOffset = parseFloat(params[2]);
                const width = parseFloat(params[3]);
                const height = parseFloat(params[4]);
                if (isNaN(xOffset) || isNaN(yOffset) || isNaN(width) || isNaN(height)) {
                    throw new Error(`x_offset/y_offset/width/height param cannot be parsed as float: ${line}`);
                }
                const points = [
                    {x: xOffset, y: yOffset},
                    {x: xOffset + width, y: yOffset},
                    {x: xOffset + width, y: yOffset + height},
                    {x: xOffset, y: yOffset + height}
                ];

                svgData = ImageUtils.polygonAsSvg(svgData, points, strokeWidth, bgColor, fgColor);
                break;
            }
            case 'poly': {
                const params = line.split(/\s+/);
                if (params.length < 1) {
                    throw new Error(`Bad params -- poly x1 y1 x2 y2 x3 y3 ...: ${line}`);
                }
                const points = (() => {
                    const arr = params.slice(1);
                    if (arr.length % 2 !== 0) {
                        throw new Error(`Require an even number of x/y points: ${line}`);
                    }
                    const ret /*{x, y}[]*/ = [];
                    for (let i = 0; i < arr.length; i += 2) {
                        const xVal = parseFloat(arr[i]);
                        const yVal = parseFloat(arr[i+1]);
                        if (isNaN(xVal) || isNaN(yVal)) {
                            throw new Error(`x/y point cannot be parsed as float: ${line}`);
                        }
                        ret.push({x: xVal, y: yVal});
                    }
                    return ret;
                })();

                svgData = ImageUtils.polygonAsSvg(svgData, points, strokeWidth, bgColor, fgColor);
                break;
            }
            case 'arrow': {
                const params = line.split(/\s+/);
                if (params.length < 1) {
                    throw new Error(`Bad params -- arrow x1 y1 x2 y2 ...: ${line}`);
                }
                const points = (() => {
                    const arr = params.slice(1);
                    if (arr.length % 2 !== 0) {
                        throw new Error(`Require an even number of x/y points: ${line}`);
                    }
                    const ret /*{x, y}[]*/ = [];
                    for (let i = 0; i < arr.length; i += 2) {
                        const xVal = parseFloat(arr[i]);
                        const yVal = parseFloat(arr[i+1]);
                        if (isNaN(xVal) || isNaN(yVal)) {
                            throw new Error(`x/y point cannot be parsed as float: ${line}`);
                        }
                        ret.push({x: xVal, y: yVal});
                    }
                    return ret;
                })();

                if (strokeWidth === 0) {
                    throw new Error(`Stroke size must be greater than 0: ${line}`);
                }
                
                svgData = ImageUtils.arrowAsSvg(svgData, points, strokeWidth, fgColor);
                break;
            }
            case 'text': {
                const params = line.split(/\s+/, 4);
                if (params.length !== 4) {
                    throw new Error(`Bad params -- text x_offset y_offset word ...: ${line}`);
                }
                const xOffset = parseFloat(params[1]);
                const yOffset = parseFloat(params[2]);
                if (isNaN(xOffset) || isNaN(yOffset)) {
                    throw new Error(`x_offset/y_offset param cannot be parsed as float: ${line}`);
                }
                const text = getRemainder(line, /\s+/g, 3);

                svgData = ImageUtils.textAsSvg(svgData, xOffset, yOffset, text, fontSize, bgColor, fgColor);
                break;
            }
            default:
                throw new Error('Unrecognized image command: ' + command);
        }
    }

    return {
        dstImgData: svgData,
        altText: altText,
        title: title
    };
}



function getRemainder(str, sep /*regular exp*/, idx) {
    while (true) {
        const sepRes = sep.exec(str);
        if (sepRes === null) {
            throw new Error(); // this should never happen
        }
        str = str.slice(sep.lastIndex);
        sep.lastIndex = 0;

        idx--;
        if (idx === 0) {
            return str;
        }
    }
}







let content = FileSystem.readFileSync('/input/input.data', 'utf8').trim();
let filePath = FileSystem.readFileSync('/input/input.files', 'utf8').trim();
if (filePath.split('\n').length === 0) {
    throw Error('No image file specified');
} else if (filePath.split('\n').length > 1) {
    throw Error('Too many image files specified');
}
filePath = '/input/' + filePath;

const imgCodeHash = Crypto.createHash('md5').update(content).digest('hex');
const imgOutputDirPath = `img_${imgCodeHash}`;
const imgOutputFilePath = `${imgOutputDirPath}/data.svg`;

const srcImgData = FileSystem.readFileSync(filePath); //read as raw buffer
const output = processImage(srcImgData, content);
FileSystem.mkdirpSync(`/output/${imgOutputDirPath}`);
FileSystem.writeFileSync(
    `/output/${imgOutputFilePath}`,
    output.dstImgData,
    { encoding: 'utf8' }
);
FileSystem.writeFileSync(
    `/output/output.md`,
    `<p><img src="${ImageUtils.quoteAttr(imgOutputFilePath, false)}" alt="${ImageUtils.quoteAttr(output.altText, false)}" title="${ImageUtils.quoteAttr(output.title, false)}" /></p>`,
    { encoding: 'utf8' }
);
