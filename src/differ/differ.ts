import { JSDOM } from "jsdom";

export function markChangeInBody(oldInput: JSDOM, newInput: JSDOM, injectionId: string): boolean {
    const oldBodies = oldInput.window.document.getElementsByTagName('body');
    const newBodies = newInput.window.document.getElementsByTagName('body');
    if (oldBodies.length !== 1 || newBodies.length !== 1) {
        throw `Require exactly 1 body tag -- old=${oldBodies.length} new: ${newBodies.length}`;
    }
    return internalMarkBodyChange(oldBodies[0], newBodies[0], injectionId);
}

function internalMarkBodyChange(oldInput: Node, newInput: Node, injectionId: string): boolean {
    if (oldInput.nodeType !== newInput.nodeType) {
        inject(newInput, injectionId, InjectPosition.BEFORE);
        return true;
    }

    switch (oldInput.nodeType) {
        case oldInput.COMMENT_NODE:       // Can't use Node.COMMENT_NODE because Node isn't exposed
            break; // ignore comments
        case oldInput.ELEMENT_NODE:       // Can't use Node.ELEMENT_NODE because Node isn't exposed
            const oldElement = oldInput as HTMLElement;
            const newElement = newInput as HTMLElement;

            if (oldElement.nodeName !== newElement.nodeName) {
                inject(newInput, injectionId, InjectPosition.BEFORE);
                return true;
            }

            const oldAttrs = oldElement.attributes;
            const newAttrs = newElement.attributes;
            if (oldAttrs.length !== newAttrs.length) {
                inject(newInput, injectionId, InjectPosition.BEFORE);
                return true;
            }
            for (let i = 0; i < oldAttrs.length; i++) {
                const oldAttr = oldAttrs[i];
                const newAttr = newAttrs[i];
                if (oldAttr.name !== newAttr.name || oldAttr.value !== newAttr.value) {
                    inject(newInput, injectionId, InjectPosition.BEFORE);
                    return true;
                }
            }

            const oldChildren = oldElement.children;
            const newChildren = newElement.children;
            const len = Math.min(oldChildren.length, newChildren.length);
            let oldChild: ChildNode | null = null;
            let newChild: ChildNode | null = null;
            for (let i = 0; i < len; i++) {
                oldChild = oldChildren[i];
                newChild = newChildren[i];
                const changedChild = internalMarkBodyChange(oldChild, newChild, injectionId);
                if (changedChild === true) {
                    return true;
                }
            }
            if (newChildren.length > oldChildren.length) {
                const lastNewChild = newChildren[len - 1];
                inject(lastNewChild, injectionId, InjectPosition.AFTER);
                return true;
            } else if (newChildren.length < oldChildren.length) {
                if (newChildren.length === 0) {
                    inject(newElement, injectionId, InjectPosition.BEFORE);
                    return true;
                } else {
                    const lastNewChild = newChildren[len - 1];
                    inject(lastNewChild, injectionId, InjectPosition.AFTER); // or inject before? not sure which is better to do
                    return true;
                }
            } else {
                // no change
            }
            break;
        case oldInput.TEXT_NODE:          // Can't use Node.TEXT_NODE because Node isn't exposed
        case oldInput.CDATA_SECTION_NODE: // Can't use Node.CDATA_SECTION_NODE because Node isn't exposed
            const oldText = oldInput.nodeValue;
            const newText = oldInput.nodeValue;
            if (oldText !== newText) {
                injectInText(oldInput, newInput, injectionId);
                return true;
            } 
            break;
        default:
            throw 'Unrecognized child type: ' + oldInput.nodeType; // this should never happen? maybe -- not sure.
    }

    return false;
}

enum InjectPosition {
    BEFORE,
    AFTER
}

function inject(node: Node, id: string, position: InjectPosition) {
    const document = node.ownerDocument;
    if (document === null) {
        throw 'Null document';
    }

    const parent = node.parentElement;
    if (parent === null) {
        throw 'Null parent';
    }

    const injectNode = document.createElement('a');
    injectNode.id = id;
    
    if (node.nodeName === 'body' && node.nodeType === node.ELEMENT_NODE) {
        // special case -- we can't add the injection before or after a body tag, so add it as the first/last child instead
        switch (position) {
            case InjectPosition.BEFORE:
                node.insertBefore(injectNode, (node as HTMLElement).firstElementChild);
                break;
            case InjectPosition.AFTER:
                parent.insertBefore(injectNode, null);
                break;
            default:
                throw 'Unexpected'; // should never happen
        }
    } else {
        switch (position) {
            case InjectPosition.BEFORE:
                parent.insertBefore(injectNode, node);
                break;
            case InjectPosition.AFTER:
                parent.insertBefore(injectNode, node.nextSibling);
                break;
            default:
                throw 'Unexpected'; // should never happen
        }
    }
}

function injectInText(oldNode: Node, newNode: Node, id: string) {
    const document = newNode.ownerDocument;
    if (document === null) {
        throw 'Null document';
    }

    const parent = newNode.parentElement;
    if (parent === null) {
        throw 'Null parent';
    }

    const injectNode = document.createElement('a');
    injectNode.id = id;

    const oldText = oldNode.nodeValue;
    const newText = newNode.nodeValue;
    if (oldText === null || newText === null) {
        throw 'Text nodes do not have text content'; // this should never happen?
    }
    const mismatchIdx = firstDifferenceInText(oldText, newText);

    const newTextStart = newText.substring(0, mismatchIdx);
    const newTextEnd = newText.substring(mismatchIdx);

    const preInjectNode = document.createTextNode(newTextStart);
    const postInjectNode = document.createTextNode(newTextEnd);
    parent.insertBefore(preInjectNode, newNode);
    parent.insertBefore(injectNode, newNode);
    parent.insertBefore(postInjectNode, newNode);
    parent.removeChild(newNode);
}

export function firstDifferenceInText(oldIn: string, newIn: string): number {
    const len = Math.min(oldIn.length, newIn.length);
    let mismatchIdx = -1;
    for (let i = 0; i < len; i++) {
        const oldCh = oldIn[i];
        const newCh = newIn[i];
        if (oldCh !== newCh) {
            mismatchIdx = i;
            break;
        }
    }
    if (mismatchIdx === -1) {
        mismatchIdx = len;
    }
    return mismatchIdx;
}




{
    const oldDom = new JSDOM('<html><head></head><body><a><b><c></c></b></a></body></html>');
    const newDom = new JSDOM('<html><head></head><body><a><b></b></a></body></html>');
    const changed = markChangeInBody(oldDom, newDom, 'changed_here');
    console.log(changed);
    console.log(newDom.serialize());
}