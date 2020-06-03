import {
    AdjustNode,
    Insertion,
    InteriorNode,
    LeafNode,
    NodeKind,
    Orphan,
    RopeBase,
    TreeContext,
} from "./types";

import {
    assert,
} from "./common";

import {
    initArray,
    clearR,
    shiftR,
    deleteAndShiftLossy,
} from "./arrayUtil";

export const EMPTY = -1;

export function createInterior<T>(size: number, lengths: number[], segments: AdjustNode<T>[]): InteriorNode<T> {
    return { kind: NodeKind.Interior, size, lengths, segments };
}

export function createLeaf<T>(size: number, lengths: number[], segments: T[], prev: LeafNode<T> | undefined, next: LeafNode<T> | undefined): LeafNode<T> {
    return { kind: NodeKind.Leaf, size, lengths, segments, prev, next };
}

export function singletonLeaf<T>(ctx: TreeContext<T>, length: number, content: T) {
    const lengths: number[] = initArray(ctx.leafLengthSize, EMPTY);
    const segments: T[] = initArray(ctx.leafSegmentSize, ctx.emptySegment);
    lengths[0] = length;
    segments[0] = content;
    return createLeaf(/* size */ 1, lengths, segments, /* prev */ undefined,  /* next */ undefined);
}

/**
 * Return the left-most leaf in the tree. Assumes that each
 * intermediate node is non-empty.
 *
 * @param node
 */
export function leftmostLeaf<T>(node: AdjustNode<T>): LeafNode<T> {
    let n = node;
    while (n.kind !== NodeKind.Leaf) {
        n = n.segments[0]!;
    }
    return n;
}

/**
 * Return the right-most leaf in the tree. Assumes that each
 * intermediate node is non-empty.
 *
 * @param node
 */
export function rightmostLeaf<T>(node: AdjustNode<T>): LeafNode<T> {
    let n = node;
    while (n.kind !== NodeKind.Leaf) {
        n = n.segments[n.size - 1]!;
    }
    return n;
}

export function find(node: RopeBase<unknown>, position: number): { index: number, offset: number } {
    let index = 0;
    let offset = position;
    const { lengths, size } = node;
    while (index < size) {
        const len = lengths[index];
        if (offset < len) {
            break;
        }
        offset -= len;
        index += 1;
    }
    return { index, offset };
}

export function deleteNodeTail<T>(node: RopeBase<T>, start: number, empty: T) {
    const size = node.size;
    clearR(node.lengths, start, size, EMPTY);
    clearR(node.segments, start, size, empty);
    node.size = start;
}

export function deleteNodeRange<T>(node: RopeBase<T>, start: number, count: number, empty: T) {
    const size = node.size;
    deleteAndShiftLossy(node.lengths, start, count, size, EMPTY);
    deleteAndShiftLossy(node.segments, start, count, size, empty);
    node.size = size - count;
}

function mergeIntoLeft<T>(left: RopeBase<T>, right: RopeBase<T>): number {
    const { size: lSize, lengths: lLengths, segments: lSegments } = left;
    const { size: rSize, lengths: rLengths, segments: rSegments } = right;
    let lenDelta = 0;
    for (let i = 0; i < rSize; i++) {
        lenDelta += lLengths[i + lSize] = rLengths[i];
        lSegments[i + lSize] = rSegments[i];
    }
    left.size = lSize + rSize;
    right.size = 0;
    return lenDelta;
}

function redistributeIntoLeft<T>(left: RopeBase<T>, right: RopeBase<T>, delta: number, empty: T): number {
    const { size: lSize, lengths: lLengths, segments: lSegments } = left;
    const { lengths: rLengths, segments: rSegments } = right;
    let lengthDelta = 0;
    for (let i = 0; i < delta; i++) {
        const idx = lSize + i;
        lengthDelta += lLengths[idx] = rLengths[i];
        lSegments[idx] = rSegments[i];
    }
    left.size += delta;
    deleteNodeRange(right, 0, delta, empty);
    return lengthDelta;
}

function redistributeIntoRight<T>(left: RopeBase<T>, right: RopeBase<T>, delta: number, empty: T): number {
    const { size: lSize, lengths: lLengths, segments: lSegments } = left;
    const { size: rSize, lengths: rLengths, segments: rSegments } = right;
    shiftR(rLengths, 0, rSize - 1, delta);
    shiftR(rSegments, 0, rSize - 1, delta);
    const lBaseIndex = lSize - delta;
    let lengthDelta = 0;
    for (let i = 0; i < delta; i++) {
        const lIndex = lBaseIndex + i;
        lengthDelta += rLengths[i] = lLengths[lIndex];
        lLengths[lIndex] = EMPTY;
        rSegments[i] = lSegments[lIndex];
        lSegments[lIndex] = empty;
    }
    left.size -= delta;
    right.size += delta;
    return -lengthDelta;
}

/**
 * Returns the length delta for the left node. 
 * @param ctx
 * @param left
 * @param right
 */
function rebalanceRopes<T>(ctx: { order: number }, left: RopeBase<T>, right: RopeBase<T>, empty: T): number {
    const leftSize = left.size;
    const rightSize = right.size;
    const minSize = ctx.order;
    if (leftSize >= minSize) {
        if (rightSize >= minSize) {
            return 0;
        }
        const adjusted = Math.floor((rightSize + leftSize) / 2);
        return adjusted >= minSize ? redistributeIntoRight(left, right, adjusted - rightSize, empty) : mergeIntoLeft(left, right);
    }
    if (rightSize >= minSize) {
        const adjusted = Math.floor((rightSize + leftSize) / 2);
        return adjusted >= minSize ? redistributeIntoLeft(left, right, adjusted - leftSize, empty) : mergeIntoLeft(left, right);
    }
    return mergeIntoLeft(left, right);
}

/**
 * Try and rebalance two nodes. Merging into a single node is always
 * left-biased. The effect of the function can be determined as follows:
 * 
 * If the length delta is zero then both nodes were well-sized.
 * If the size of right is zero, then the right was merged into the left.
 * Otherwise, the nodes were redistributed according to the delta (positive means adding to left).
 *
 * If right.size is zero after, then length delta should equal length of right.
 *
 * Returns the length delta for the left node. 
 * @param ctx
 * @param left
 * @param right
 */
export function rebalanceNodes<T>(ctx: TreeContext<T>, left: LeafNode<T>, right: LeafNode<T>): number;
export function rebalanceNodes<T>(ctx: TreeContext<T>, left: InteriorNode<T>, right: InteriorNode<T>): number;
export function rebalanceNodes<T>(ctx: TreeContext<T>, left: AdjustNode<T>, right: AdjustNode<T>): number {
    assert("node rebalance must be done on nodes of the same kind", left.kind === right.kind)
    if (left.kind === NodeKind.Leaf) {
        const delta = rebalanceRopes(ctx, left, right as LeafNode<T>, ctx.emptySegment);
        if (right.size === 0) {
            assert("When merging into left, length delta must be non-zero", delta > 0);
            /**
             * If the size is zero after the rebalancing then we have
             * merged the right into the left and we need to update
             * the link for the left to skip past the right.
             */
            const rhs = (right as LeafNode<T>).next;
            left.next = rhs;
            if (rhs) {
                rhs.prev = left;
            }
            (right as LeafNode<T>).next = undefined;
            (right as LeafNode<T>).prev = undefined;
        }
        return delta;
    }
    return rebalanceRopes(ctx, left, right as InteriorNode<T>, undefined!);
}

/**
 * Ensure that childIndex is balanced in parent by redistributing with
 * a sibling, or merging.
 *
 * Node can be left under-full after this function if we merge and
 * node.size was at the minimum keys.
 *
 * TODO: Try and look either size of the index to avoid merging and
 * creating an under-full parent.
 *
 * @param ctx
 * @param parent
 * @param childIndex
 */
export function ensureBalancedChildInNode<T>(ctx: TreeContext<T>, parent: InteriorNode<T>, childIndex: number): Orphan<T> | undefined {
    const size = parent.size;
    const { segments } = parent;
    const child = segments[childIndex]
    if (child.size >= ctx.order) {
        return undefined;
    }
    if (size < 2) {
        return { node: child, heightDelta: 1, length: parent.lengths[childIndex] };
    }
    let leftIndex;
    let rightIndex;
    if (childIndex === 0) {
        leftIndex = 0;
        rightIndex = 1;
    } else {
        leftIndex = childIndex - 1;
        rightIndex = childIndex;
    }
    const rhs = segments[rightIndex];
    // Cast here is just to guarantee that both nodes are of the same
    // kind. We don't care whether they are interior or leaf nodes.
    const balancing = rebalanceNodes(ctx, segments[leftIndex] as InteriorNode<T>, rhs as InteriorNode<T>);
    if (balancing === 0) {
        return undefined;
    }
    const { lengths } = parent;
    if (rhs.size === 0) {
        lengths[leftIndex] += balancing;
        assert("ensureBalancedChildInNode - deleting right should return a delta equal to rhs len ", balancing === lengths[rightIndex]);
        deleteNodeRange(parent, rightIndex, 1, undefined!);
        return undefined;
    }
    lengths[leftIndex] += balancing;
    lengths[rightIndex] -= balancing;
    return undefined;

}

export function split<T>(node: RopeBase<T>, nodeSize: number, right: RopeBase<T>, targetRightSize: number, empty: T) {
    const { lengths, segments } = node;
    const { lengths: rLengths, segments: rSegments } = right;
    let newPartition = 0;
    const leftSize = nodeSize - targetRightSize;
    for (let i = 0; i < leftSize; i++) {
        newPartition += lengths[i];
    }
    for (let i = leftSize; i < nodeSize; i++) {
        rLengths[i - leftSize] = lengths[i];
        lengths[i] = EMPTY;
        rSegments[i - leftSize] = segments[i];
        segments[i] = empty;
    }
    node.size = leftSize;
    right.size = targetRightSize;
    return newPartition;
}

export function insertChild<T>(ctx: TreeContext<T>, node: InteriorNode<T>, child: AdjustNode<T>, length: number, index: number): Insertion<T> {
    const { lengths, segments, size } = node;
    assert("Insert child - position should be within bounds or directly at end", index <= size);
    shiftR(lengths, index, size - 1, 1);
    shiftR(segments, index, size - 1, 1);
    lengths[index] = length;
    segments[index] = child;
    if (size < ctx.maxKeys) {
        node.size = size + 1;
        return undefined;
    }
    const right: InteriorNode<T> = createInterior(
        /* size */ 0,
        initArray(ctx.interiorLengthSize, EMPTY),
        initArray(ctx.interiorChidrenSize, undefined!)
    );
    const newPartition = split(node, size + 1, right, ctx.order, undefined! as AdjustNode<T>);
    return [newPartition, right];
}

export function applyInsertion<T>(ctx: TreeContext<T>, node: InteriorNode<T>, index: number, length: number, insertion: Insertion<T>): Insertion<T> {
    if (insertion === undefined) {
        node.lengths[index] += length;
        return undefined;
    }
    const [leftLength, rightNode] = insertion;
    const lengths = node.lengths;
    const oldLen = node.lengths[index];
    const rhsLen = oldLen + length - leftLength;
    lengths[index] = leftLength;
    return insertChild(ctx, node, rightNode, rhsLen, index + 1);
}

function insertLeaf<T>(ctx: TreeContext<T>, node: LeafNode<T>, position: number, length: number, payload: T): Insertion<T> {
    let pos = position;
    let insertionPoint = 0;
    const { size, lengths, segments } = node;
    while (insertionPoint < size) {
        const len = lengths[insertionPoint];
        if (pos < len) {
            break;
        }
        pos -= len;
        insertionPoint += 1;
    }
    let newSize: number;
    const offset = pos > 0;
    if (insertionPoint === size) {
        assert("Appending should have no offset", !offset);
        /**
         * The segment is being appended to the end and we should have
         * no offset.
         */
        lengths[insertionPoint] = length
        segments[insertionPoint] = payload
        newSize = size + 1;
    }
    else {
        /** 
         * The segment is being inserted into the existing
         * segments. The are two cases.
         *
         * 1. We are inserting at a point that cuts a segment. We
         * split the existing segment and place it either side of our
         * new segment.
         *
         * 2. We are inserting directly between two segments. We shift
         * everything across.
         *
         */
        if (offset) {
            const oldLen = lengths[insertionPoint];
            assert('oldLen - pos > 0', oldLen - pos > 0);
            /**
             * We are splitting an existing segment so we need to
             * create two extra spaces: one for the newly inserted
             * segment, and one for the remaining part of the split
             * segment.
             */
            shiftR(lengths, insertionPoint + 1, size - 1, 2)
            shiftR(segments, insertionPoint + 1, size - 1, 2)
            const { retained, removed } = ctx.extractSegmentRange(segments[insertionPoint], pos, oldLen - pos);
            lengths[insertionPoint] = pos;
            lengths[insertionPoint + 1] = length;
            lengths[insertionPoint + 2] = oldLen - pos;
            segments[insertionPoint] = retained;
            segments[insertionPoint + 1] = payload;
            segments[insertionPoint + 2] = removed;
            newSize = size + 2;
        }
        else {
            shiftR(lengths, insertionPoint, size - 1, 1)
            shiftR(segments, insertionPoint, size - 1, 1)
            lengths[insertionPoint] = length;
            segments[insertionPoint] = payload
            newSize = size + 1;
        }
    }
    if (newSize <= ctx.maxKeys) {
        node.size = newSize;
        return undefined;
    }
    const lhSize = ctx.order + 1;
    const leaf = createLeaf(
        /* size */ 0,
        initArray(ctx.leafLengthSize, EMPTY),
        initArray(ctx.leafSegmentSize, ctx.emptySegment),
        /* prev */ node,
        /* next */ node.next
    );
    const newPartition = split(node, newSize, leaf, newSize - lhSize, ctx.emptySegment);
    if (node.next) {
        node.next.prev = leaf;
    }
    node.next = leaf;
    return [newPartition, leaf];
}

function insertInterior<T>(ctx: TreeContext<T>, node: InteriorNode<T>, position: number, length: number, payload: T): Insertion<T> {
    const { size, lengths, segments } = node;
    let pos = position;
    let insertionPoint = 0;
    while (insertionPoint < size) {
        const len = lengths[insertionPoint];
        /**
         * (<=) rather than (<) here is because we don't need to add
         * nodes at this level. We are just looking for a segment to
         * possibly append to.
         */
        if (pos <= len) {
            break;
        }
        pos -= len;
        insertionPoint++;
    }
    return applyInsertion(ctx, node, insertionPoint, length, insertNode(ctx, segments[insertionPoint]!, pos, length, payload));
}

export function insertNode<T>(ctx: TreeContext<T>, node: AdjustNode<T>, position: number, length: number, payload: T): Insertion<T> {
    if (node.kind === NodeKind.Interior) {
        return insertInterior(ctx, node, position, length, payload);
    }
    return insertLeaf(ctx, node, position, length, payload);
}
