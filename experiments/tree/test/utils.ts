/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { ITreeShapeReader, TreeNode } from "../src";

export function forEachChild(tree: ITreeShapeReader, parent: TreeNode, callback: (child: TreeNode) => boolean): void {
    let current = tree.getFirstChild(parent);
    while (current !== TreeNode.none && callback(current)) {
        current = tree.getNextSibling(current);
    }
}

export function checkPrevLink(tree: ITreeShapeReader, node: TreeNode): void {
    const prev = tree.getPrevSibling(node);
    if (prev !== TreeNode.none) {
        const actual = tree.getNextSibling(prev);
        assert.equal(actual, node,
            `Prev node '${prev}' must point to next node '${node}', but got '${actual}'`);
    }
}

export function checkNextLink(tree: ITreeShapeReader, node: TreeNode): void {
    const next = tree.getNextSibling(node);
    if (next !== TreeNode.none) {
        const actual = tree.getPrevSibling(next);
        assert.equal(actual, node,
            `Next node '${next}' must point back to prev node '${node}', but got '${actual}'`);
    }
}

export function checkChildren(tree: ITreeShapeReader, parent: TreeNode): void {
    let lastChild = TreeNode.none;

    forEachChild(tree, parent, (child) => {
        const actual = tree.getParent(child);
        assert.equal(actual, parent, `Child '${child}' must point to parent '${parent}', but got='${actual}'.`);

        lastChild = child;

        return true;
    });

    const actual = tree.getLastChild(parent);
    assert.equal(actual, lastChild, `Parent '${parent}' must point to last child '${lastChild}', but got '${actual}'`)
}

function checkParent(tree: ITreeShapeReader, node: TreeNode): void {
    const parent = tree.getParent(node);
    if (parent !== TreeNode.none) {
        let found = 0;
        forEachChild(tree, parent, (child) => {
            if (child === node) { found++; }
            return true;
        });
        assert.equal(found, 1, `Parent '${parent}' must contain child '${node}' exactly once, but found '${found}'.`);
    }
}

export function checkShape(tree: ITreeShapeReader, node = TreeNode.root): number {
    if (node === TreeNode.none) {
        return 0;
    }

    checkParent(tree, node);
    checkPrevLink(tree, node);
    checkNextLink(tree, node);
    checkChildren(tree, node);

    let count = 1;
    forEachChild(tree, node, (child) => {
        count += checkShape(tree, child);
        return true;
    });

    return count;
}
