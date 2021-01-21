/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { GraphShape, GraphNode } from "../src";
import { expectShape, GraphShapeDescription } from "./utils";

describe("GraphShape", () => {
    const root = GraphNode.root;
    let graph: GraphShape;

    function expect(expected: GraphShapeDescription) {
        expectShape(graph, expected);
    }

    beforeEach(() => { graph = new GraphShape(); });

    it("empty graph", () => {
        // An empty graph contains only the root node.
        expect([root]);
    });

    it("insert child", () => {
        const child = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, child);
        expect([root, [[child]]]);
    });

    it("insert before", () => {
        const right = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, right);
        expect([root, [[right]]]);

        const left = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, left);
        expect([root, [[left], [right]]]);

    });

    it("insert after", () => {
        const left = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, left);
        expect([root, [[left]]]);

        const right = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 1, /* removeCount: */ 0, right);
        expect([root, [[left], [right]]]);
    });

    it("remove child", () => {
        const child = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, child);
        expect([root, [[child]]]);

        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 1);
        expect([root]);
    });

    it("remove first", () => {
        const left = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, left);
        expect([root, [[left]]]);

        const right = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 1, /* removeCount: */ 0, right);
        expect([root, [[left], [right]]]);

        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 1);
        expect([root, [[right]]]);
    });

    it("remove last", () => {
        const left = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, left);
        expect([root, [[left]]]);

        const right = graph.createNode();
        graph.spliceChildren(GraphNode.root, /* start: */ 1, /* removeCount: */ 0, right);
        expect([root, [[left], [right]]]);

        graph.spliceChildren(GraphNode.root, /* start: */ 1, /* removeCount: */ 1);
        expect([root, [[left]]]);
    });

    it("cycle", () => {
        graph.spliceChildren(GraphNode.root, /* start: */ 0, /* removeCount: */ 0, root);
        expect([root, [[root]]]);
    });
});
