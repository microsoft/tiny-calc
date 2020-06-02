import {
    AdjustNode,
    NodeKind,
    TreeContext,    
} from "./types";

import {
    EMPTY,
} from "./node";

export function validate(existing: boolean, test: boolean, message: string): boolean {
    if (!test) {
        console.log(new Error().stack);
    }
    return existing && test;
}

export function validateNode<T>(context: TreeContext<T>, node: AdjustNode<T>, minSize: number, height: number): [boolean, number, number] {
    let valid = true;
    valid = validate(valid, node.size >= minSize, "min size");
    let keySize = node.lengths.indexOf(EMPTY);
    keySize = keySize === -1 ? node.lengths.length : keySize;
    valid = validate(valid, keySize === node.size, "length size in sync with cache");
    if (node.kind === NodeKind.Interior) {
        let childSize = node.segments.indexOf(undefined!);
        childSize = childSize === -1 ? node.segments.length : childSize;
        valid = validate(valid, node.lengths.length === context.interiorLengthSize, "length array has correct size");
        valid = validate(valid, node.segments.length === context.interiorChidrenSize, "children array has correct size");
        let totalLen = 0;
        let childHeight: number | undefined;
        for (let i = 0; i < keySize; i++) {
            const child = node.segments[i]!;
            const [ok, len, h] = validateNode(context, child, minSize, height + 1);
            if (childHeight === undefined) {
                childHeight = h;
            }
            else {
                valid = validate(valid, h === childHeight, "subnode height");
            }
            totalLen += len;
            valid = validate(valid, ok, "subnode validation");
            valid = validate(valid, len === node.lengths[i], "sublengths in parent are correct");
        }
        return [valid, totalLen, childHeight!];
    }
    valid = validate(valid, node.lengths.length === context.leafLengthSize, "leaf length array is fundamentally correct size");
    valid = validate(valid, node.segments.length === context.leafSegmentSize, "leaf segment array is fundamentally correct size");
    valid = validate(valid, node.segments[node.size - 1] !== context.emptySegment, "leaf segment array does not empty with empty segment")
    let totalLen = 0;
    for (let i = 0; i < keySize; i++) {
        const len = node.lengths[i]!;
        totalLen += len;
    }
    return [valid, totalLen, height];
}
