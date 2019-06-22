export class NodeMismatch {
    public readonly oldNode: Node;
    public readonly newNode: Node;

    public constructor(oldNode: Node, newNode: Node) {
        if (oldNode.nodeType !== newNode.nodeType) {
            throw 'Types must equal';
        }
        switch (oldNode.nodeType) {
            case oldNode.ELEMENT_NODE:         // Can't use Node.ELEMENT_NODE because Node isn't exposed
            case oldNode.TEXT_NODE:            // Can't use Node.TEXT_NODE because Node isn't exposed
            case oldNode.CDATA_SECTION_NODE:   // Can't use Node.CDATA_SECTION_NODE because Node isn't exposed
                break;
            default:
                throw 'Unsupported type: ' + oldNode.nodeType;
        }    
        this.oldNode = oldNode;
        this.newNode = newNode;
    }
}

export function firstDifferenceInNode(oldIn: HTMLElement, newIn: HTMLElement): NodeMismatch | null {
    if (oldIn.nodeName !== newIn.nodeName) {
        return new NodeMismatch(oldIn, newIn);
    }

    const oldAttrs = oldIn.attributes;
    const newAttrs = newIn.attributes;
    if (oldAttrs.length !== newAttrs.length) {
        return new NodeMismatch(oldIn, newIn);
    }
    for (let i = 0; i < oldAttrs.length; i++) {
        const oldAttr = oldAttrs[i];
        const newAttr = newAttrs[i];
        if (oldAttr.name !== newAttr.name || oldAttr.value !== newAttr.value) {
            return new NodeMismatch(oldIn, newIn);
        }
    }
    
    const oldChildren = oldIn.childNodes;
    const newChildren = newIn.childNodes;
    if (oldChildren.length !== newChildren.length) {
        return new NodeMismatch(oldIn, newIn);
    }
    for (let i = 0; i < oldChildren.length; i++) {
        const oldChild = oldChildren[i];
        const newChild = newChildren[i];
        if (oldChild.nodeType !== newChild.nodeType) {
            return new NodeMismatch(oldIn, newIn);
        }
        switch (oldChild.nodeType) {
            case oldChild.COMMENT_NODE:       // Can't use Node.COMMENT_NODE because Node isn't exposed
                break; // ignore comments
            case oldChild.ELEMENT_NODE:       // Can't use Node.ELEMENT_NODE because Node isn't exposed
                const updatedChild = firstDifferenceInNode(oldChild as HTMLElement, newChild as HTMLElement);
                if (updatedChild !== null) {
                    return updatedChild;
                } 
                break;
            case oldChild.TEXT_NODE:          // Can't use Node.TEXT_NODE because Node isn't exposed
            case oldChild.CDATA_SECTION_NODE: // Can't use Node.CDATA_SECTION_NODE because Node isn't exposed
                const oldText = oldChild.nodeValue;
                const newText = newChild.nodeValue;
                if (oldText !== newText) {
                    return new NodeMismatch(oldChild, newChild);
                } 
                break;
            default:
                throw 'Unrecognized child type: ' + oldChild.nodeType; // this should never happen? maybe -- not sure.
        }
    }

    return null;
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

export function applyDifferenceMarker(mismatch: NodeMismatch, injectionId: string): void {
    var newNodeDocument = mismatch.newNode.ownerDocument;
    if (newNodeDocument === null) {
        throw 'No owning document for new element';
    }

    const parent = mismatch.newNode.parentNode;
    if (parent === null) {
        throw 'Parent cannot be null'; // this should never happen?
    }

    const injectNode = newNodeDocument.createElement('a');
    injectNode.id = injectionId;

    // node types between old and new are known to be equal at this point
    switch (mismatch.newNode.nodeType) {
        case mismatch.newNode.ELEMENT_NODE: {       // Can't use Node.ELEMENT_NODE because Node isn't exposed
            parent.insertBefore(injectNode, mismatch.newNode);
            break;
        }
        case mismatch.newNode.TEXT_NODE:            // Can't use Node.TEXT_NODE because Node isn't exposed
        case mismatch.newNode.CDATA_SECTION_NODE: { // Can't use Node.CDATA_SECTION_NODE because Node isn't exposed
            const oldText = mismatch.oldNode.nodeValue;
            const newText = mismatch.newNode.nodeValue;
            if (oldText === null || newText === null) {
                throw 'Text nodes do not have text content'; // this should never happen?
            }
            const mismatchIdx = firstDifferenceInText(oldText, newText);

            const newTextStart = newText.substring(0, mismatchIdx);
            const newTextEnd = newText.substring(mismatchIdx);

            const preInjectNode = newNodeDocument.createTextNode(newTextStart);
            const postInjectNode = newNodeDocument.createTextNode(newTextEnd);
            parent.insertBefore(preInjectNode, mismatch.newNode);
            parent.insertBefore(injectNode, mismatch.newNode);
            parent.insertBefore(postInjectNode, mismatch.newNode);
            parent.removeChild(mismatch.newNode);
            break;
        }
        default:
            throw 'Unrecognized child type: ' + mismatch.newNode.nodeType; // this should never happen
    }
}