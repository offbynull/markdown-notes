import FileSystem from 'fs-extra';
import { wrapAsSvg, scaleAsSvg, resizeAsSvg, cropAsSvg, polygonAsSvg, textAsSvg, arrowAsSvg } from "./image_utils";


// this doesn't test that the annotations made it out... just makes sure no crashes happen
//  check the output file manually
// test('must annotate images', () => {
//     let svgData = Buffer.from(
// `<?xml version="1.0" standalone="no"?>
// <svg width="100" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">
// <circle cx="50" cy="50" r="47.5" stroke="red" fill="transparent" stroke-width="5"/>
// </svg>`);

//     svgData = Buffer.from(wrapAsSvg(svgData));
//     svgData = Buffer.from(scaleAsSvg(Buffer.from(svgData), 0.5, 2.0));
//     svgData = Buffer.from(resizeAsSvg(svgData, 20, 200));
//     svgData = Buffer.from(cropAsSvg(svgData, 0, 50, 20, 100));
//     svgData = Buffer.from(canvasResizeAsSvg(svgData, 300, 300, -10, -10));
//     svgData = Buffer.from(polygonAsSvg(svgData, [{x: 105, y: 105}, {x: 105, y: 150}, {x: 150, y: 105}]));
//     svgData = Buffer.from(highlightArrowAsSvg(svgData, [{x: 5, y: 5}, {x: 5, y: 50}, {x: 50, y: 25}], 6));
//     svgData = Buffer.from(highlightTextAsSvg(svgData, 50, 50, 'Hello world!'));
//     svgData = Buffer.from(highlightTextAsSvg(svgData, 70, 70, 'Hi!'));

//     FileSystem.writeFileSync('/tmp/output.svg', svgData);
// });