/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { TreeShape, TreeNode } from "../../../src";
import { UuidTree } from "./uuidtree";

// Regex that matches a well formed UUID.
const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/g

function vetUuid(s: string) {
    // If the node has not been assigned a UUID, the 'ids' array returns <undefined, undefined>,
    // which after coercion produces the following special string.
    //
    // (Note that this string also also fails the version check.)
    assert.notEqual(s, "00000000-0000-7ff8-ff00-0000000000f8",
        "IdTree must assign a UUID to all nodes.");

    assert.equal(s.match(regex)![0], s,
        "UUID must be formatted as 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'");

    const b: number[] = [];

    const parseRange = (start: number, stop: number) => {
        do {
            b.push(parseInt(s.slice(start, start += 2), 16));
        } while (start < stop)
    }

    parseRange(0, 8);
    parseRange(9, 13);
    parseRange(14, 18);
    parseRange(19, 23);
    parseRange(24, 36);

    assert.equal(b[6] >>> 4, 4,
        "The four most significant bits of the 'time_hi_and_version' field must be '0100'.");
    assert.equal(b[8] >>> 6, 2,
        "The two most significant bits of the 'clock_seq_hi_and_reserved' field must be '10'.");
}

describe("UuidTree", () => {
    let shape: TreeShape;
    let ids: UuidTree;

    beforeEach(() => {
        shape = new TreeShape();
        ids = new UuidTree(shape);
    });

    it("Root is assigned a UUID", () => {
        const rootId = ids.getNode(TreeNode.root);
        vetUuid(rootId);
    });

    it("Id assigned on insertion", () => {
        const child = shape.createNode();
        shape.moveNode(child, shape.firstChildOf(TreeNode.root));
        vetUuid(ids.getNode(child));
    });

    it("Id preserved on move", () => {
        const child1 = shape.createNode();
        shape.moveNode(child1, shape.firstChildOf(TreeNode.root));
        const id1 = ids.getNode(child1);
        vetUuid(id1);

        const child2 = shape.createNode();
        shape.moveNode(child2, shape.firstChildOf(TreeNode.root));
        const id2 = ids.getNode(child2);
        vetUuid(id2);

        shape.moveNode(child2, shape.firstChildOf(child1));
        assert.equal(ids.getNode(child1), id1);
        assert.equal(ids.getNode(child2), id2);
    });

    it("Id reassigned for recycled nodes", () => {
        const node1 = shape.createNode();
        shape.moveNode(node1, shape.firstChildOf(TreeNode.root));
        const id1 = ids.getNode(node1);
        vetUuid(id1);

        shape.deleteNode(node1);

        const node2 = shape.createNode();
        assert.equal(node2, node1,
            "Test relies on node1 being recycled/reallocated as node2.");

        shape.moveNode(node2, shape.firstChildOf(TreeNode.root));
        const id2 = ids.getNode(node2);
        vetUuid(id2);
        assert.notEqual(id2, id1, "New 'UUID' must be assigned for recycled node.");
    });
});
