/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { IGraphShapeProducer, GraphNode, IGraphShapeReader } from "../src";

export const nullGraphConsumer = { childrenChanged(): void {} };

export type GraphShapeDescription = [node: GraphNode, children?: GraphShapeDescription[]];

function descriptionToReader(desc: GraphShapeDescription): IGraphShapeReader {
    const shape: GraphNode[][] = [];

    const visit = (root: GraphShapeDescription) => {
        const node = root[0];
        if (shape[node] === undefined) {
            const children = root[1] ?? [];
            shape[node] = children.map(([child]) => child);
            for (const child of children) {
                visit(child);
            }
        }
    }

    visit(desc);

    return {
        getChildCount(parent: GraphNode) { return shape[parent].length },
        getChild(parent: GraphNode, index: number) { return shape[parent][index] }
    }
}

export function shapeToString(reader: IGraphShapeReader): string {
    const visited = new Set<GraphNode>();
    const visit = (root: GraphNode) => {
        if (visited.has(root)) {
            return `${root}*`;
        }

        visited.add(root);

        let s = `${root}`;
        const children = [];
        for (let i = 0; i < reader.getChildCount(root); i++) {
            children.push(visit(reader.getChild(root, i)));
        }

        if (children.length > 0) {
            s = `${s} (${children.join(" ")})`;
        }

        return s;
    }

    return visit(GraphNode.root);
}

export function descriptionToString(expected: GraphShapeDescription): string {
    return shapeToString(descriptionToReader(expected));
}

export function expectShape(actual: IGraphShapeProducer, expected: GraphShapeDescription): void {
    const actualReader = actual.openGraph(nullGraphConsumer);
    try {
        const actualStr = shapeToString(actualReader);
        const expectedStr = descriptionToString(expected);

        assert.equal(actualStr, expectedStr);
    } finally {
        actual.closeGraph(nullGraphConsumer);
    }
}
