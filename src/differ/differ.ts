import { JSDOM } from "jsdom";
import { diffChars } from "diff";


export function diffAndMark(input1: string, input2: string): string {
    const sanitized1 = new JSDOM(input1).serialize();
    const sanitized2 = new JSDOM(input2).serialize();
    
    const changes = diffChars(sanitized1, sanitized2);
    let input1EndIdx = 0;
    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        if (change.added === true || change.removed === true) {
            break;
        }
        input1EndIdx += change.value.length;
    }
    
    const input1Header = input1.substring(0, input1EndIdx);
    const lastElemMatch = /.*<[^/].*?>/g.exec(input1Header);
    if (lastElemMatch === null) {
        return input1;
    }
    const lastElemIdx = lastElemMatch[0].length;
    
    const input1Augmented = input1.substring(0, lastElemIdx) + '<a href="#__ELEMENT_CHANGE"></a>' + input1.substring(lastElemIdx);
    return input1Augmented;
}



// console.log(
//     diffAndMark(
//         '<html><head></head><body><a><b><c></c></b></a></body></html>',
//         '<html><head></head><body><a><b><c></c><c2></c2></b></a></body></html>'
//     )
// );

// console.log(
//     diffAndMark(
//         '<html><head></head><body><a><b><c></c></b></a></body></html>',
//         '<html><head></head><body><a><b><c><d></d></c></b></a></body></html>'
//     )
// );

// console.log(
//     diffAndMark(
//         '<html><head></head><body><a><b><c><d></d></c></b></a></body></html>',
//         '<html><head></head><body><a><b><c></c></b></a></body></html>'
//     )
// );