import {
    AdjustNode,
    Deletion,
    LeafNode,
    Insertion,
    InteriorNode,
    NodeKind,
    Orphan,
    TreeContext,
} from "./types";

import { assert } from "./common";

import {
    applyInsertion,
    createLeaf,
    EMPTY,
    deleteNodeRange,
    deleteNodeTail,
    ensureBalancedChildInNode,
    insertChild,
    find,
    leftmostLeaf,
    rebalanceNodes,
    rightmostLeaf,
    singletonLeaf,
    split,
} from "./node";

import { deleteAndShift, initArray } from "./arrayUtil";

/**
 * Reparent an underfull adjust node with valid children at a given
 * depth.
 *
 */
function reparent<T>(ctx: TreeContext<T>, node: AdjustNode<T>, orphan: Orphan<T>, before: boolean): Insertion<T> {
    const { heightDelta, node: child, length } = orphan;
    const idx = before ? 0 : node.size - 1;
    assert("We can only call reparent on interior nodes", node.kind === NodeKind.Interior);
    if (heightDelta > 1) {
        orphan.heightDelta--;
        return applyInsertion(ctx, node, idx, length, reparent(ctx, node.segments[idx], orphan, before));
    }

    const sibling = node.segments[idx];
    const siblingLen = node.lengths[idx];

    const lenChange = before
        ? rebalanceNodes(ctx, child as InteriorNode<T>, sibling as InteriorNode<T>)
        : rebalanceNodes(ctx, sibling as InteriorNode<T>, child as InteriorNode<T>);

    if (lenChange === 0) {
        return insertChild(ctx, node, child, length, before ? 0 : node.size);
    }

    if (child.size === 0) {
        node.lengths[idx] += length;
        return undefined;
    }

    if (before) {
        if (sibling.size === 0) {
            node.lengths[idx] += length;
            node.segments[idx] = child;
            return undefined;
        }
        node.lengths[idx] = siblingLen - lenChange;
        const res = insertChild(ctx, node, child, length + lenChange, /* index */ 0);
        return res;
    }

    node.lengths[idx] += lenChange;
    return insertChild(ctx, node, child, length - lenChange, /* index */ node.size);
}

function mergeOrphans<T>(ctx: TreeContext<T>, node: InteriorNode<T>, leftIndex: number, left: Orphan<T>, rightIndex: number, right: Orphan<T>): [number, Orphan<T>] {
    const { node: l, length: lLength, heightDelta: lHeight } = left;
    const { node: r, length: rLength, heightDelta: rHeight } = right;
    if (lHeight === rHeight) {
        rebalanceNodes(ctx, l as InteriorNode<T>, r as InteriorNode<T>);
        deleteNodeRange(node, rightIndex, 1, undefined!);
        return [leftIndex, { node: l, heightDelta: lHeight, length: lLength + rLength }];
    }
    if (lHeight > rHeight) {
        left.heightDelta = lHeight - rHeight;
        reparent(ctx, r, left, /* before */ true);
        deleteNodeRange(node, leftIndex, 1, undefined!);
        return [rightIndex - 1, { node: r, heightDelta: rHeight, length: lLength + rLength }];
    }
    right.heightDelta = rHeight - lHeight;
    reparent(ctx, l, right, /* before */ false);
    deleteNodeRange(node, rightIndex, 1, undefined!);
    return [leftIndex, { node: l, heightDelta: lHeight, length: lLength + rLength }];
}

function partitionNode<T>(ctx: TreeContext<T>, node: InteriorNode<T>, startOffset: number, startIndex: number, endOffset: number, endIndex: number): Deletion<T> {
    assert("startIndex < endIndex", startIndex < endIndex);
    const { lengths, segments, size } = node;

    let leftSplitState = startOffset === 0 ? undefined : startIndex;
    let rightSplitState = endOffset === 0 ? undefined : endIndex;

    const firstSplit: Deletion<T> = startOffset === 0 ?
        { orphan: undefined, deleted: leftmostLeaf(segments[startIndex]) }
        : splitChildL(ctx, node, startIndex, startOffset);

    if (startOffset !== 0) {
        lengths[startIndex] = startOffset;
    }

    const secondSplit: Deletion<T> | undefined = endOffset === 0 ?
        endIndex === size
        ? undefined
        : { orphan: undefined, deleted: leftmostLeaf(segments[endIndex]).prev! }
    : splitChildR(ctx, node, endIndex, endOffset);

    if (endOffset !== 0) {
        lengths[endIndex] -= endOffset;
    }

    const firstDeletedLeaf = firstSplit.deleted;
    const firstRetainedLeaf = firstDeletedLeaf.prev;
    const lastDeletedLeaf = secondSplit ? secondSplit.deleted : undefined;
    const lastRetainedLeaf = lastDeletedLeaf ? lastDeletedLeaf.next : undefined;

    if (firstRetainedLeaf) {
        firstRetainedLeaf.next = lastRetainedLeaf;
    }
    if (lastRetainedLeaf) {
        lastRetainedLeaf.prev = firstRetainedLeaf;
    }
    if (lastDeletedLeaf) {
        lastDeletedLeaf.next = undefined;
    }
    firstDeletedLeaf.prev = undefined;

    const wholeStartIndex = startOffset === 0 ? startIndex : startIndex + 1;
    const toRemove = endIndex - wholeStartIndex;

    if (toRemove > 0) {
        deleteNodeRange(node, wholeStartIndex, toRemove, undefined!)
        rightSplitState = rightSplitState === undefined ? undefined : rightSplitState - toRemove;
        endIndex -= toRemove;
    }

    let remainingOrphan: Orphan<T> | undefined;
    let remainingOrphanIndex: number | undefined;

    if (firstSplit.orphan && secondSplit && secondSplit.orphan) {
        leftSplitState = undefined;
        rightSplitState = undefined;
        [remainingOrphanIndex, remainingOrphan] =
            mergeOrphans(ctx, node, startIndex, firstSplit.orphan, endIndex, secondSplit.orphan);
    }
    else if (firstSplit.orphan) {
        remainingOrphan = firstSplit.orphan;
        remainingOrphanIndex = startIndex;
        leftSplitState = undefined;
    }
    else if (secondSplit && secondSplit.orphan) {
        remainingOrphan = secondSplit.orphan;
        remainingOrphanIndex = endIndex;
        rightSplitState = undefined;
    }

    if (remainingOrphan) {
        assert("remainingOrphanIndex is defined when orphan is", remainingOrphanIndex !== undefined);
        if (node.size === 1) {
            return remainingOrphan.heightDelta++, { orphan: remainingOrphan, deleted: firstDeletedLeaf };
        }
        
        deleteNodeRange(node, remainingOrphanIndex, 1, undefined!);
        if (leftSplitState !== undefined && leftSplitState > remainingOrphanIndex) { leftSplitState--; }
        if (rightSplitState !== undefined && rightSplitState > remainingOrphanIndex) { rightSplitState--; }

        const size = node.size;
        if (remainingOrphanIndex === 0) {
            applyInsertion(ctx, node, 0, remainingOrphan.length, reparent(ctx, node.segments[0], remainingOrphan, /* before */ true));
            const adjustment = node.size - size;
            if (leftSplitState !== undefined) { leftSplitState + adjustment; }
            if (rightSplitState !== undefined) { rightSplitState  + adjustment; }
        }
        else {
            const idx = remainingOrphanIndex - 1;
            applyInsertion(ctx, node, idx, remainingOrphan.length, reparent(ctx, node.segments[idx], remainingOrphan, /* before */ false));
            const adjustment = node.size - size;
            if (leftSplitState !== undefined && leftSplitState > idx) { leftSplitState + adjustment; }
            if (rightSplitState !== undefined && rightSplitState > idx) { rightSplitState + adjustment; }
        }
    }

    let o1: Orphan<T> | undefined;
    let o2: Orphan<T> | undefined;
    if (leftSplitState !== undefined) {
        const size = node.size;
        o1 = ensureBalancedChildInNode(ctx, node, leftSplitState);
        if (size !== node.size) {
            rightSplitState = rightSplitState === undefined ? undefined : rightSplitState - 1;
        }
    }
    if (rightSplitState !== undefined) {
        o2 = ensureBalancedChildInNode(ctx, node, rightSplitState);
    }
    return { orphan: o1 || o2, deleted: firstDeletedLeaf };
}

function deleteLeafRange<T>(ctx: TreeContext<T>, node: LeafNode<T>, position: number, length: number): LeafNode<T> {
    const { lengths, segments, size } = node;
    const { index: startIndex, offset: startOffset } = find(node, position);
    const { index: endIndex, offset: endOffset } = find(node, position + length);

    if (startIndex === endIndex) {
        const [remaining, extracted] = ctx.deleteSegmentRange(segments[startIndex], startOffset, length);
        segments[startIndex] = remaining;
        lengths[startIndex] -= length;
        return singletonLeaf(ctx, length, extracted);
    }

    const deletedLengths: number[] = initArray(ctx.leafLengthSize, EMPTY);
    const deletedSegments: T[] = initArray(ctx.leafSegmentSize, ctx.emptySegment);
    let deletedSize = 0;

    if (startOffset !== 0) {
        const len = lengths[startIndex] - startOffset;
        const [remaining, extracted] = ctx.deleteSegmentRange(segments[startIndex], startOffset, len);
        segments[startIndex] = remaining;
        lengths[startIndex] = startOffset;
        deletedLengths[0] = len;
        deletedSegments[0] = extracted;
        deletedSize++;
    }

    const wholeStartIndex = startOffset === 0 ? startIndex : startIndex + 1;
    const offset = wholeStartIndex - startIndex;
    const toRemove = endIndex - wholeStartIndex;

    if (endOffset !== 0) {
        const len = endOffset;
        const [remaining, extracted] = ctx.deleteSegmentRange(segments[endIndex], 0, endOffset);
        segments[endIndex] = remaining;
        lengths[endIndex] -= endOffset;
        deletedLengths[offset + toRemove] = len;
        deletedSegments[offset + toRemove] = extracted;
        deletedSize++;
    }

    if (toRemove > 0) {
        const lens = deleteAndShift(lengths, wholeStartIndex, toRemove, size, EMPTY);
        const removed = deleteAndShift(segments, wholeStartIndex, toRemove, size, ctx.emptySegment);
        for (let i = 0; i < toRemove; i++) {
            deletedLengths[i + offset] = lens[i];
            deletedSegments[i + offset] = removed[i];
        }
        deletedSize += toRemove;
    }

    const removedLeaf = createLeaf(deletedSize, deletedLengths, deletedSegments, undefined, undefined);
    node.size -= toRemove;
    return removedLeaf;
}

export function deleteNode<T>(ctx: TreeContext<T>, node: AdjustNode<T>, position: number, length: number): Deletion<T> {
    if (node.kind === NodeKind.Leaf) {
        return { orphan: undefined, deleted: deleteLeafRange(ctx, node, position, length) };
    }

    /**
     * Start offset / index is the first index to be touched by the delete.
     * End offset / index is the first index to be in the resulting tail.
     */
    const { index: startIndex, offset: startOffset } = find(node, position);
    const { index: endIndex, offset: endOffset } = find(node, position + length);

    assert("Insertion point should be found for delete", startIndex < node.size);
    assert("endIndex < size || endOffset === 0", endIndex < node.size || endOffset === 0);
    assert("startIndex < endIndex || startOffset < endOffset", startIndex < endIndex || startOffset < endOffset);

    if (startIndex !== endIndex) {
        return partitionNode(ctx, node, startOffset, startIndex, endOffset, endIndex);
    }

    assert("endOffset - startOffset === length", endOffset - startOffset === length);
    const split = deleteNode(ctx, node.segments[startIndex], startOffset, length);

    if (split.orphan === undefined) {
        node.lengths[startIndex] -= length;
        split.orphan = ensureBalancedChildInNode(ctx, node, startIndex);
        return split;
    }

    if (node.size === 1) {
        split.orphan.heightDelta++;
        return split;
    }

    deleteNodeRange(node, startIndex, 1, undefined!);
    const insertionIndex = startIndex === 0 ? 0 : startIndex - 1;
    const result = applyInsertion(
        ctx, node, insertionIndex, split.orphan.length,
        reparent(ctx, node.segments[insertionIndex], split.orphan, startIndex === 0)
    );
    assert("Should always have space to insert child", result === undefined);
    split.orphan = undefined;
    return split;
}

function splitLeaf<T>(ctx: TreeContext<T>, node: LeafNode<T>, position: number): { left: LeafNode<T>; right: LeafNode<T> } {
    assert("Split should not be called with zero-pos", position > 0);
    const { lengths, segments, size } = node;
    const { index, offset } = find(node, position);
    if (offset === 0) {
        const right = createLeaf(
            /* size */ 0,
            initArray(ctx.leafLengthSize, EMPTY),
            initArray(ctx.leafSegmentSize, ctx.emptySegment),
            /* prev */ node,
            /* next */ node.next
        );
        split(node, size, right, size - index, ctx.emptySegment);
        if (node.next) {
            node.next.prev = right;
        }
        node.next = right;
        return { left: node, right };
    }
    const rest = lengths[index] - offset;
    const [l, r] = ctx.deleteSegmentRange(segments[index], offset, rest);
    const rightLengths: number[] = initArray(ctx.leafLengthSize, EMPTY);
    const rightSegments: T[] = initArray(ctx.leafSegmentSize, ctx.emptySegment);
    const rhsSize = size - index;
    for (let i = index + 1; i < size; i++) {
        rightLengths[i - index] = lengths[i];
        rightSegments[i - index] = segments[i];
        lengths[i] = EMPTY;
        segments[i] = ctx.emptySegment;
    }
    lengths[index] = offset;
    segments[index] = l;
    rightLengths[0] = rest;
    rightSegments[0] = r;
    const right = createLeaf(rhsSize, rightLengths, rightSegments, node, node.next);
    node.size = index + 1;
    if (node.next) {
        node.next.prev = right;
    }
    node.next = right;
    return { left: node, right };
}

function splitLeft<T>(ctx: TreeContext<T>, node: InteriorNode<T>, position: number): Deletion<T> {
    assert("Split should not be called with zero-pos", position > 0);
    const { index, offset } = find(node, position);

    if (offset === 0) {
        assert("index > 0", index > 0);
        const deleted = leftmostLeaf(node.segments[index]);
        deleteNodeTail(node, index, undefined!)
        return { orphan: undefined, deleted };
    }

    const lengths = node.lengths;
    const split = splitChildL(ctx, node, index, offset);
    deleteNodeTail(node, index + 1, undefined!);

    if (split.orphan === undefined) {
        lengths[index] = offset;
        split.orphan = ensureBalancedChildInNode(ctx, node, index);
        return split;
    }

    split.orphan.heightDelta++;

    if (index === 0) {
        return split;
    }

    deleteNodeTail(node, index, undefined!);
    const result = reparent(ctx, node, split.orphan, /* before */ false);
    assert("Should always have space to insert child", result === undefined);
    split.orphan = undefined;
    return split;
}

function splitRight<T>(ctx: TreeContext<T>, node: InteriorNode<T>, position: number): Deletion<T> {
    assert("Split should not be called with zero-pos", position > 0);
    const { index, offset } = find(node, position);

    if (offset === 0) {
        assert("index > 0", index > 0);
        const deleted = rightmostLeaf(node.segments[index - 1]);
        deleteNodeRange(node, 0, index, undefined!);
        return { orphan: undefined, deleted };
    }

    const { lengths, size } = node;
    const split = splitChildR(ctx, node, index, offset);
    deleteNodeRange(node, 0, index, undefined!);

    if (split.orphan === undefined) {
        lengths[0] -= offset;
        split.orphan = ensureBalancedChildInNode(ctx, node, /* childIndex */ 0);
        return split;
    }

    split.orphan.heightDelta++;

    if (index === size - 1) {
        return split;
    }

    deleteNodeRange(node, 0, 1, undefined!);
    reparent(ctx, node, split.orphan, /* before */ true);
    split.orphan = undefined;
    return split;
}

function splitChildL<T>(ctx: TreeContext<T>, parent: InteriorNode<T>, index: number, position: number) {
    const child = parent.segments[index];
    if (child.kind === NodeKind.Leaf) {
        const { left, right } = splitLeaf(ctx, child, position);
        parent.segments[index] = left;
        return { orphan: undefined, deleted: right };
    }
    return splitLeft(ctx, child, position);
}

function splitChildR<T>(ctx: TreeContext<T>, parent: InteriorNode<T>, index: number, position: number) {
    const child = parent.segments[index];
    if (child.kind === NodeKind.Leaf) {
        const { left, right } = splitLeaf(ctx, child, position);
        parent.segments[index] = right;
        return { orphan: undefined, deleted: left };
    }
    return splitRight(ctx, child, position);
}
