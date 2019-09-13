import ImageSize from 'image-size';
import MarkdownIt from 'markdown-it';
import FileSystem from 'fs-extra';

function wrapImage(pathOrBuffer: string | Buffer) {
    const imgBuffer = pathOrBuffer instanceof Buffer ? pathOrBuffer : FileSystem.readFileSync(pathOrBuffer);
    const imgData = ImageSize(imgBuffer);
    const imgMimeType = (() => {
        switch (imgData.type) {
            case 'svg':
                return 'image/svg+xml';
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'gif':
                return 'image/gif';
            case 'png':
                return 'image/png';
            default:
                throw new Error('Unrecognized image file type: ' + imgData.type);
        }
    })();

    const base64Data = imgBuffer.toString('base64');
    const dataUri = `data:${imgMimeType};base64,${base64Data}`;

    return {
        width: imgData.width,
        height: imgData.height,
        mimeType: imgMimeType,
        dataUri: dataUri
    };
}

export function wrapAsSvg(pathOrBuffer: string | Buffer) {
    const data = wrapImage(pathOrBuffer);

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${data.width}" height="${data.height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
</svg>`
    );
}

export function scaleAsSvg(pathOrBuffer: string | Buffer, xFactor: number, yFactor: number) {
    if (xFactor <= 0 || yFactor <= 0) {
        throw new Error('x/y scale factors must be > 0');
    }

    const data = wrapImage(pathOrBuffer);

    const newWidth = data.width * xFactor;
    const newHeight = data.height * yFactor;

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${newWidth}" height="${newHeight}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image transform="scale(${xFactor} ${yFactor})" xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
</svg>`
    );
}

export function resizeAsSvg(pathOrBuffer: string | Buffer, width: number, height: number) {
    if (width <= 0 || height <= 0) {
        throw new Error('width/height must be > 0');
    }

    const data = wrapImage(pathOrBuffer);

    const xFactor = width / data.width;
    const yFactor = height / data.height;

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image transform="scale(${xFactor} ${yFactor})" xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
</svg>`
    );
}

export function expandAsSvg(pathOrBuffer: string | Buffer, width: number, height: number, xOffset: number = 0, yOffset: number = 0) {
    if (width <= 0 || height <= 0) {
        throw new Error('width/height must be > 0');
    }

    const data = wrapImage(pathOrBuffer);

    // negaitve offsets mean they're offset from the other side
    if (xOffset < 0) {
        xOffset = width - data.width - (-xOffset);
    }

    if (yOffset < 0) {
        yOffset = height - data.height - (-yOffset);
    }

    width = width * data.width;
    height = height * data.height;
    xOffset = xOffset * data.width;
    yOffset = yOffset * data.height;

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image xlink:href="${data.dataUri}" x="${xOffset}" y="${yOffset}" width="${data.width}" height="${data.height}" />
</svg>`
    );
}

export function cropAsSvg(pathOrBuffer: string | Buffer, x: number, y: number, width: number, height: number) {
    if (x < 0 || x > 1 || y < 0 || y > 1) {
        throw new Error('x/y must be >= 0 and <= 1');
    }

    if (width <= 0 || width > 1 || height <= 0 || height > 1) {
        throw new Error('width/height must be > 0 and <= 1');
    }

    const data = wrapImage(pathOrBuffer);

    if (width > data.width || height > data.height) {
        throw new Error('width/height must be <= image width/height');
    }

    x = x * data.width;
    y = y * data.height;
    width = width * data.width;
    height = height * data.height;

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image transform="translate(${-x} ${-y})" xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
</svg>`
    );
}

export function polygonAsSvg(pathOrBuffer: string | Buffer, polygon: {x: number, y: number}[], strokeWidth: number = 0, bgColor: string, fgColor: string) {
    if (polygon.length < 2) {
        throw new Error('polygon requires atleast 2 points');
    }

    validateColorValue(bgColor);
    validateColorValue(fgColor);

    const data = wrapImage(pathOrBuffer);

    polygon = polygon.map(e => ({
        x: e.x * data.width,
        y: e.y * data.height
    }));

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${data.width}" height="${data.height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<image xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
<polygon points="${polygon.map(p => p.x + ' ' + p.y).join(' ')}" stroke="${fgColor}" fill="${bgColor}" stroke-width="${strokeWidth}"/>
</svg>`
    );
}


export function arrowAsSvg(pathOrBuffer: string | Buffer, path: {x: number, y: number}[], thickness: number, color: string) {
    if (thickness <= 0) {
        throw new Error('thickness must be > 0');
    }

    if (path.length < 1) {
        throw new Error('path requires atleast 1 point');
    }

    validateColorValue(color);

    const data = wrapImage(pathOrBuffer);

    path = path.map(e => ({
        x: e.x * data.width,
        y: e.y * data.height
    }));

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${data.width}" height="${data.height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
<!-- https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker -->
<marker id="arrow" viewBox="0 0 4 4" refX="0" refY="2"
    markerWidth="4px" markerHeight="4px"
    orient="auto-start-reverse">
<path d="M 0 0 L 4 2 L 0 4 z" fill="${color}" />
</marker>
</defs>
<image xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
<polyline points="${path.map(p => p.x + ' ' + p.y).join(' ')}" fill="none" stroke="${color}" stroke-width="${thickness}" marker-end="url(#arrow)"/>
</svg>`
    );
}

export function textAsSvg(pathOrBuffer: string | Buffer, x: number, y: number, text: string, size: number, bgColor: string, fgColor: string) {
    if (size <= 0) {
        throw new Error('size must be > 0');
    }

    validateColorValue(bgColor);

    validateColorValue(fgColor);

    const data = wrapImage(pathOrBuffer);

    x = x * data.width;
    y = y * data.height;

    return Buffer.from(
`<?xml version="1.0" standalone="no"?>
<svg width="${data.width}" height="${data.height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<!-- Embedded font is OpenSans... extracted from https://gist.github.com/stefanmaric/a5043c0998d9fc35483d --> 
<style>
@font-face {
    font-family: 'Open Sans';
    src: url(data:application/font-woff;charset=utf-8;base64,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) format('woff');
    font-weight: normal;
    font-style: normal;
}

.highlightText {
  font: 'Open Sans';
  fill: ${fgColor};
}
</style>
<image xlink:href="${data.dataUri}" x="0" y="0" width="${data.width}" height="${data.height}" />
<!-- https://stackoverflow.com/a/42783381 -->
<defs>
<filter x="0" y="0" width="1" height="1" id="solid">
  <feFlood flood-color="${bgColor}"/>
  <feComposite in="SourceGraphic" operator="xor"/>
</filter>
</defs>
<text filter="url(#solid)" x="${x}" y="${y}" font-size="${size}px" class="highlightText">${new MarkdownIt().utils.escapeHtml(text)}</text>
<text x="${x}" y="${y}" font-size="${size}px" class="highlightText">${new MarkdownIt().utils.escapeHtml(text)}</text>
</svg>`
    );
}






export function validateColorValue(color: string) {
    if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) === false) {
        throw new Error(`${color} doesn't match RGB / RGBA hexidecimal notation (e.g. #ab10ff7f)`);
    }
}