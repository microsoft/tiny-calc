/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { TreeShape } from "../src/treeshape";
import { TreeNode, ITreeWriter, ITreeReader } from "../src/types";
import { Expr, EvalTree } from "./evaltree";
import { InputTree } from "./inputtree";

describe("EvalTree", () => {
    let input: ITreeWriter<Expr>;
    let output: ITreeReader<number>;
    
    beforeEach(() => {
        const shape = new TreeShape();
        const inputTree = new InputTree<Expr>(shape);
        const outputTree = new EvalTree(inputTree);
        
        input = inputTree;
        output = outputTree;
    });

    it("=0", () => {
        input.setNode(TreeNode.root, 0);
        assert.equal(output.getNode(TreeNode.root), 0);
    });
});
