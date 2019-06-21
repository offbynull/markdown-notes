// const newBody = new JSDOM(newIn).window.document.getElementsByName('body')[0].innerHTML;
// const oldBody = new JSDOM(oldIn).window.document.getElementsByName('body')[0].innerHTML;

function findFirstDifference(newIn: string, oldIn: string): number {
    const checkLen = Math.min(newIn.length, oldIn.length);
    for (let i = 0; i < checkLen; i++) {
        const newCh = newIn[i];
        const oldCh = oldIn[i];
        if (newCh !== oldCh) {
            return i;
        }
    }
    return newIn.length;
}

enum HtmlRegion {
    TEXT = 'TEXT',
    TAG = 'TAG',
}

function determineRegion(input: string, index: number): HtmlRegion {
    const preTagStart = input.substring(0, index).indexOf('<');
    const preTagEnd = input.substring(0, index).indexOf('>');

    const postTagStart = input.indexOf('<', index);
    const postTagEnd = input.indexOf('>', index);

    if ((preTagStart !== -1 && preTagEnd === -1)
            && (postTagStart === -1 && postTagEnd !== -1)) { // inbetween a < and >
        return HtmlRegion.TAG;
    } else if ((preTagStart !== -1 && preTagEnd !== -1 && preTagStart < preTagEnd)
            || (postTagStart !== -1 && postTagEnd != -1 && postTagStart < postTagEnd)) { // inbetween a <...> and <...>
        return HtmlRegion.TEXT;
    }

    throw 'Unrecognized';
}

console.log(determineRegion('<a>test</a>', 0));
console.log(determineRegion('<a>test</a>', 1));
console.log(determineRegion('<a>test</a>', 5));