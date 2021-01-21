/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { TreeShape } from "../src";
import { checkShape, root } from "./utils";

describe("TreeShape", () => {
    let tree: TreeShape;

    beforeEach(() => { tree = new TreeShape(); });

    describe("empty", () => {
        it("contains well-formed root", () => {
            assert.equal(checkShape(tree, root), 1);
        });

        it("detached node", () => {
            assert.equal(checkShape(tree, root), 1);

            const node = tree.createNode();
            assert.equal(checkShape(tree, node), 1);
        });
    });

    describe("move", () => {
        it("insert first child", () => {
            const node = tree.createNode();
            tree.moveNode(node, tree.firstChildOf(root));
            assert.equal(checkShape(tree, root), 2);
        });

        it("insert last child", () => {
            const node = tree.createNode();
            tree.moveNode(node, tree.lastChildOf(root));
            assert.equal(checkShape(tree, root), 2);
        });

        it("insert before first child", () => {
            const right = tree.createNode();
            tree.moveNode(right, tree.firstChildOf(root));

            const left = tree.createNode();
            tree.moveNode(left, tree.beforeNode(right));

            assert.equal(tree.getFirstChild(root), left);
            assert.equal(checkShape(tree, root), 3);
        });

        it("insert after first child", () => {
            const left = tree.createNode();
            tree.moveNode(left, tree.firstChildOf(root));

            const right = tree.createNode();
            tree.moveNode(right, tree.afterNode(left));

            assert.equal(tree.getFirstChild(root), left);
            assert.equal(checkShape(tree, root), 3);
        });

        it("insert middle child after left", () => {
            const left = tree.createNode();
            tree.moveNode(left, tree.firstChildOf(root));

            const right = tree.createNode();
            tree.moveNode(right, tree.afterNode(left));

            const middle = tree.createNode();
            tree.moveNode(middle, tree.afterNode(left));

            assert.equal(tree.getNextSibling(left), middle);
            assert.equal(tree.getNextSibling(middle), right);
            assert.equal(checkShape(tree, root), 4);
        });

        it("insert middle child before right", () => {
            const left = tree.createNode();
            tree.moveNode(left, tree.firstChildOf(root));

            const right = tree.createNode();
            tree.moveNode(right, tree.afterNode(left));

            const middle = tree.createNode();
            tree.moveNode(middle, tree.beforeNode(right));

            assert.equal(tree.getNextSibling(left), middle);
            assert.equal(tree.getNextSibling(middle), right);
            assert.equal(checkShape(tree, root), 4);
        });
    });

    describe("remove", () => {
        it("remove root of empty tree", () => {
            tree.removeNode(root);
            assert.equal(checkShape(tree, root), 1);
        });

        it("remove first child", () => {
            const node = tree.createNode();
            tree.moveNode(node, tree.firstChildOf(root));

            tree.removeNode(node);
            assert.equal(checkShape(tree, root), 1);
            assert.equal(checkShape(tree, node), 1);
        });

        it("remove left child", () => {
            const right = tree.createNode();
            tree.moveNode(right, tree.firstChildOf(root));

            const left = tree.createNode();
            tree.moveNode(left, tree.beforeNode(right));

            tree.removeNode(left);
            assert.equal(checkShape(tree, root), 2);
            assert.equal(checkShape(tree, left), 1);
        });

        it("remove right child", () => {
            const left = tree.createNode();
            tree.moveNode(left, tree.firstChildOf(root));

            const right = tree.createNode();
            tree.moveNode(right, tree.afterNode(left));

            tree.removeNode(right);
            assert.equal(checkShape(tree, root), 2);
            assert.equal(checkShape(tree, right), 1);
        });

        it("remove middle child", () => {
            const left = tree.createNode();
            tree.moveNode(left, tree.firstChildOf(root));

            const right = tree.createNode();
            tree.moveNode(right, tree.afterNode(left));

            const middle = tree.createNode();
            tree.moveNode(middle, tree.afterNode(left));

            tree.removeNode(middle);
            assert.equal(checkShape(tree, root), 3);
            assert.equal(checkShape(tree, middle), 1);
        });
    });
});
