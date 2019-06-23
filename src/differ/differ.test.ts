// import { JSDOM } from "jsdom";
// import { firstDifferenceInText, findUpdateInHtmlBody } from "./differ";

// test('detect nothing if inputs are the same', () => {
//     const oldDom = new JSDOM('<html><head></head><body></body></html>');
//     const newDom = new JSDOM('<html><head></head><body></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     expect(diffPoint).toBe(null);
// });

// test('detect missing child element', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b><c></c></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><b></b></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('b')[0]);
// });

// test('detect added child element', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><b><c></c></b></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('b')[0]);
// });

// test('detect replaced child element', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><X></X></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('X')[0]);
// });

// test('detect replaced child last sibling element test', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b></b><b></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><b></b><X></X></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('X')[0]);
// });

// test('detect replaced child first sibling element test', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b></b><b></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><X></X><b></b></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('X')[0]);
// });

// test('detect replaced child both sibling element test', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b></b><b></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><X></X><X></X></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('X')[0]);
// });

// test('detect different text node', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b>000</b><b>000</b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><b>000</b><b>111</b></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('b')[1].childNodes[0]);
// });

// test('detect element with different attributes', () => {
//     const oldDom = new JSDOM('<html><head></head><body><a><b></b><b></b></a></body></html>');
//     const newDom = new JSDOM('<html><head></head><body><a><b></b><b attrib1=123></b></a></body></html>');
//     const diffPoint = findUpdateInHtmlBody(oldDom, newDom);
//     if (diffPoint == null) {
//         throw 'Cannot be null';
//     }
//     expect(diffPoint.foundNew).toBe(newDom.window.document.getElementsByTagName('b')[1]);
// });




// test('detect text change when old side is empty', () => {
//     const idx = firstDifferenceInText('', '111');
//     expect(idx).toBe(0);
// });

// test('detect text change when new side is empty', () => {
//     const idx = firstDifferenceInText('111', '');
//     expect(idx).toBe(0);
// });

// test('detect text change when lengths equal', () => {
//     const idx = firstDifferenceInText('111', '101');
//     expect(idx).toBe(1);
// });

// test('detect text change when old is smaller but matches up to that length', () => {
//     const idx = firstDifferenceInText('11', '111');
//     expect(idx).toBe(2);
// })

// test('detect text change when new is smaller but matches up to that length', () => {
//     const idx = firstDifferenceInText('111', '11');
//     expect(idx).toBe(2);
// })




// // test('must inject marker on different element', () => {
// //     const oldBody = new JSDOM('<html><head></head><body><a><b></b><b></b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const newBody = new JSDOM('<html><head></head><body><a><b></b><b attrib1=123></b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const diffPoint = findUpdateInHtmlBody(oldBody, newBody);
// //     if (diffPoint == null) {
// //         throw 'Cannot be null';
// //     }
// //     injectDifferenceMarker(diffPoint, 'INJ');
// //     expect(newBody.outerHTML).toBe('<body><a><b></b><a id="INJ"></a><b attrib1="123"></b></a></body>');
// // });

// // test('must inject in text node just before the actual change', () => {
// //     const oldBody = new JSDOM('<html><head></head><body><a><b>000</b><b>101</b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const newBody = new JSDOM('<html><head></head><body><a><b>000</b><b>111</b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const diffPoint = findUpdateInHtmlBody(oldBody, newBody);
// //     if (diffPoint == null) {
// //         throw 'Cannot be null';
// //     }
// //     injectDifferenceMarker(diffPoint, 'INJ');
// //     expect(newBody.outerHTML).toBe('<body><a><b>000</b><b>1<a id="INJ"></a>11</b></a></body>');
// // });

// // test('must inject in text node on early old termination', () => {
// //     const oldBody = new JSDOM('<html><head></head><body><a><b>000</b><b>11</b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const newBody = new JSDOM('<html><head></head><body><a><b>000</b><b>111</b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const diffPoint = findUpdateInHtmlBody(oldBody, newBody);
// //     if (diffPoint == null) {
// //         throw 'Cannot be null';
// //     }
// //     injectDifferenceMarker(diffPoint, 'INJ');
// //     expect(newBody.outerHTML).toBe('<body><a><b>000</b><b>11<a id="INJ"></a>1</b></a></body>');
// // });

// // test('must inject in text node on early new termination', () => {
// //     const oldBody = new JSDOM('<html><head></head><body><a><b>000</b><b>111</b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const newBody = new JSDOM('<html><head></head><body><a><b>000</b><b>11</b></a></body></html>').window.document.getElementsByTagName('body')[0];
// //     const diffPoint = findUpdateInHtmlBody(oldBody, newBody);
// //     if (diffPoint == null) {
// //         throw 'Cannot be null';
// //     }
// //     injectDifferenceMarker(diffPoint, 'INJ');
// //     expect(newBody.outerHTML).toBe('<body><a><b>000</b><b>11<a id="INJ"></a></b></a></body>');
// // });