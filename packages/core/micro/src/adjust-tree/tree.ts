import {
    initArray,
} from "./arrayUtil";

import {
    deleteNode,
} from "./delete";

import {
    createLeaf,
    createInterior,
    EMPTY,
    find,
    insertNode,
} from "./node";

import {
    AdjustNode,
    AdjustTree,
    AdjustTreeDebug,
    NodeKind,
    SegmentRange,
    TreeConfiguration,
    TreeContext,
    LeafFocus,
    LeafNode,
} from "./types";

import {
    validate,
    validateNode,
} from "./validity"

function createTreeContext<T>(config: TreeConfiguration<T>): TreeContext<T> {
    const order = config.order;
    return {
        emptySegment: config.emptySegment,
        order,
        maxKeys: 2 * order,
        interiorLengthSize: 2 * order + 1,
        interiorChidrenSize: 2 * order + 1,
        leafLengthSize: 2 * order + 2,
        leafSegmentSize: 2 * order + 2,
        extractSegmentRange: config.extractSegmentRange,
    };
}

export class AdjustTreeBase<T> {

    context: TreeContext<T>;
    treeLength: number;
    root: AdjustNode<T>;

    constructor(config: TreeConfiguration<T>) {
        this.context = createTreeContext(config);
        this.treeLength = 0;
        this.root = createLeaf(
            /* size */ 0,
            initArray(this.context.leafLengthSize, EMPTY),
            initArray(this.context.leafSegmentSize, this.context.emptySegment),
            /* prev */ undefined,
            /* next */ undefined
        );
    }

    getLength() {
        return this.treeLength
    }

    zoom(position: number): LeafFocus<T> {
        let node = this.root;
        let offset = position;
        let index = 0;
        while (node.kind !== NodeKind.Leaf) {
            ({ index, offset } = find(node, offset));
            node = node.segments[index];
        }
        ({ index, offset } = find(node, offset));
        return { offset, index, leaf: node }
    }

    getItem(position: number): { offset: number, segment: T } {
        let node = this.root;
        let offset = position;
        let index = 0;
        while (node.kind !== NodeKind.Leaf) {
            ({ index, offset } = find(node, offset));
            node = node.segments[index];
        }
        ({ index, offset } = find(node, offset));
        return { offset, segment: node.segments[index] };
    }

    insertRange(position: number, length: number, segment: T): void {
        const context = this.context;
        const res = insertNode(context, this.root, position, length, segment);
        if (res !== undefined) {
            const [leftLength, rightNode] = res;
            const lengths: number[] = initArray(context.interiorLengthSize, EMPTY);
            const children: AdjustNode<T>[] = initArray(context.interiorChidrenSize, undefined!);
            lengths[0] = leftLength;
            lengths[1] = this.treeLength + length - leftLength;
            children[0] = this.root;
            children[1] = rightNode;
            this.root = createInterior(/* size */ 2, lengths, children);
        }
        this.treeLength += length;
        return;
    }

    deleteRange(position: number, length: number): SegmentRange<T> {
        const result = deleteNode(this.context, this.root, position, length);
        if (result.orphan) {
            this.root = result.orphan.node;
        }
        this.treeLength -= length;
        return result.deleted;
    }

    snapshot<U>(snapshotSegment: (segment: T) => U): (number | U)[] {
        let node = this.root;
        let index = 0;
        while (node.kind !== NodeKind.Leaf) {
            ({ index } = find(node, 0));
            node = node.segments[index];
        }
        const snapped: (number | U)[] = [];
        let leaf: LeafNode<T> | undefined = node;
        while (leaf !== undefined) {
            for (let i = 0; i < leaf.size; i++) {
                snapped.push(leaf.lengths[i]);
                snapped.push(snapshotSegment(leaf.segments[i]));
            }
            leaf = leaf.next;
        }
        return snapped;
    }

    // TODO: get rid of this.
    validate(): boolean {
        const { context, root } = this;
        let valid = true;
        let keySize = root.lengths.indexOf(EMPTY);
        keySize = keySize === -1 ? root.lengths.length : keySize;
        valid = validate(valid, keySize === root.size, "tree - key size");
        if (root.kind === NodeKind.Interior) {
            let childSize = root.segments.indexOf(undefined!);
            childSize = childSize === -1 ? root.segments.length : childSize;
            valid = validate(valid, root.lengths.length === context.interiorLengthSize, "root - lengths equal");
            valid = validate(valid, root.segments.length === context.interiorChidrenSize, "root - children equal");
            let childHeight: number | undefined;
            for (let i = 0; i < keySize; i++) {
                const child = root.segments[i]!;
                const [ok, len, h] = validateNode(context, child, context.order, 1);
                if (childHeight === undefined) {
                    childHeight = h;
                }
                else {
                    valid = validate(valid, h === childHeight, "subnode height");
                }
                valid = validate(valid, ok, "root - subnode ok");
                valid = validate(valid, len === root.lengths[i], "root sublengths ok");
            }
            return valid;
        }
        valid = validate(valid, root.lengths.length === context.leafLengthSize, "root - leaf lengths ok");
        valid = validate(valid, root.segments.length === context.leafSegmentSize, "root - leaf segments ok");
        return valid;
    }
}

export function forEachInSegmentRange<T>(range: SegmentRange<T>, callback: (length: number, entry: T) => boolean) {
    let cursor: SegmentRange<T> | undefined = range;
    while (cursor !== undefined) {
        const { size, lengths, segments } = cursor;
        for (let i = 0; i < size; i++) {
            if (!callback(lengths[i], segments[i])) {
                return
            };
        }
        cursor = cursor.next;
    }
}

export function loadTree<T, U>(config: TreeConfiguration<T>, loadSegment: (segment: U) => T, data: (number | U)[]) {
    const tree = createTree(config);
    let position = 0;
    for (let i = 0; i < data.length; i += 2) {
        const len = data[i] as number;
        const segment = loadSegment(data[i+1] as U);
        tree.insertRange(position, len, segment);
        position += len;
    }
    return tree;
}

export const createTreeDebug = <T>(config: TreeConfiguration<T>): AdjustTreeDebug<T> => new AdjustTreeBase(config);

export const createTree = <T>(config: TreeConfiguration<T>): AdjustTree<T> => new AdjustTreeBase(config);
