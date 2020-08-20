/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { TreeShape } from "../src/treeshape";
import { TreeNode, ITreeWriter, ITreeReader } from "../src/types";
import { Expr, EvalTree, add } from "./evaltree";
import { InputTree } from "./inputtree";

describe("EvalTree", () => {
    let shape: TreeShape;
    let input: ITreeWriter<Expr>;
    let output: ITreeReader<number>;
    let evalTree: EvalTree;

    function setRoot(expr: Expr) {
        input.setNode(TreeNode.root, expr);
    }

    function appendChild(parent: TreeNode, expr: Expr) {
        const child = shape.createNode();
        input.setNode(child, expr);
        shape.moveNode(child, shape.lastChildOf(parent));
        return child;
    }

    function expect(expected: number, evalCount: number, node = TreeNode.root) {
        const actualResult = output.getNode(node);
        assert.equal(actualResult, expected,
            `Expect subtree evaluation to produce '${expected}', but got '${actualResult}'.`);
        
        const actualCount = evalTree.evalCount;
        assert.equal(actualCount, evalCount,
            `Expect subtree evaluation to calculate '${evalCount}' nodes, but calculated '${actualCount}'.`);

        const cachedResult = output.getNode(node);
        assert.equal(cachedResult, expected,
            `Expected cached result to produce '${expected}', but got '${actualResult}'.`);

        const delta = evalTree.evalCount - actualCount;
        assert.equal(delta, 0,
            `Expect cached result to calculate 0 nodes, but calculated '${delta}' nodes.`);   
    }

    beforeEach(() => {
        shape = new TreeShape();
        const inputTree = new InputTree<Expr>(shape);
        evalTree = new EvalTree(inputTree);
        
        input = inputTree;
        output = evalTree;
    });

    it("=0", () => {
        setRoot(0);
        expect(/* result: */ 0, /* evalCount: */ 1);
    });

    it("=1 + 2", () => {
        setRoot(add);
        appendChild(TreeNode.root, 1);
        appendChild(TreeNode.root, 2);

        expect(/* result: */ 3, /* evalCount: */ 3);
    });

    it("=1 + 2, replace 1 -> 3", () => {
        setRoot(add);
        const left = appendChild(TreeNode.root, 1);
        appendChild(TreeNode.root, 2);

        expect(/* result: */ 3, /* evalCount: */ 3);

        input.setNode(left, 3);

        expect(/* result: */ 5, /* evalCount: */ 5);
    });

    it("=1 + 2, reorder", () => {
        setRoot(add);
        appendChild(TreeNode.root, 1);
        const right = appendChild(TreeNode.root, 2);

        expect(/* result: */ 3, /* evalCount: */ 3);

        shape.moveNode(right, shape.firstChildOf(TreeNode.root));
        expect(/* result: */ 3, /* evalCount: */ 5);
    });

    it("=1 + 2, remove 2", () => {
        setRoot(add);
        appendChild(TreeNode.root, 1);
        const right = appendChild(TreeNode.root, 2);

        expect(/* result: */ 3, /* evalCount: */ 3);

        shape.removeNode(right);
        expect(/* result: */ 1, /* evalCount: */ 4);
    });

    it("=1 + 2, delete 2", () => {
        setRoot(add);
        appendChild(TreeNode.root, 1);
        const right = appendChild(TreeNode.root, 2);

        expect(/* result: */ 3, /* evalCount: */ 3);

        shape.deleteNode(right);
        expect(/* result: */ 1, /* evalCount: */ 4);
    });
});
