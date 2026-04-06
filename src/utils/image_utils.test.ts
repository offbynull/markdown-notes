import { wrapAsSvg, scaleAsSvg, resizeAsSvg, cropAsSvg, polygonAsSvg, textAsSvg, arrowAsSvg } from "./image_utils";

const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W0N8AAAAASUVORK5CYII=',
    'base64'
);

test('image helpers should produce svg output', () => {
    let svgData = wrapAsSvg(tinyPng);
    svgData = scaleAsSvg(svgData, 2, 2);
    svgData = resizeAsSvg(svgData, 10, 10);
    svgData = cropAsSvg(svgData, 0, 0, 1, 1);
    svgData = polygonAsSvg(svgData, [{ x: 0, y: 0 }, { x: 1, y: 1 }], 1, '#00000080', '#ff00ff');
    svgData = arrowAsSvg(svgData, [{ x: 0, y: 0 }, { x: 1, y: 1 }], 1, '#112233');
    svgData = textAsSvg(svgData, 0.5, 0.5, 'hello', 12, '#ffffff', '#000000');

    const out = svgData.toString('utf8');
    expect(out).toContain('<svg');
    expect(out).toContain('hello');
});
