/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import {
    FrugalList,
    FrugalList_push,
    FrugalList_removeFirst,
    FrugalList_forEach
} from "@tiny-calc/frugallist";
import { HandleTable } from "@tiny-calc/handletable";
import {
    GraphNode,
    IGraphShapeConsumer,
    IGraphShapeProducer,
    IGraphShapeReader,
    IGraphShapeWriter
} from "./types";

export class GraphShape implements IGraphShapeProducer, IGraphShapeReader, IGraphShapeWriter {
    private readonly nodeToChildren = new HandleTable<GraphNode[], GraphNode>();
    private readonly nodeToParents: FrugalList<GraphNode>[] = [];
    private consumers: FrugalList<IGraphShapeConsumer>;

    public constructor() {
        const root = this.createNode();

        assert.equal(root, GraphNode.root);
    }

    // #region IGraphShapeProducer

    public openGraph(consumer: IGraphShapeConsumer): IGraphShapeReader {
        this.consumers = FrugalList_push(this.consumers, consumer);
        return this;
    }

    public closeGraph(consumer: IGraphShapeConsumer): void {
        this.consumers = FrugalList_removeFirst(this.consumers, consumer);
    }

    // #endregion IGraphShapeProducer

    // #region IGraphShapeReader

    public getChildCount(parent: GraphNode): number {
        return this.nodeToChildren.get(parent).length;
    }

    public getChild(parent: GraphNode, index: number): GraphNode {
        return this.nodeToChildren.get(parent)[index];
    }

    // #endregion IGraphShapeReader

    // #region IGraphShapeWriter

    public createNode(): GraphNode {
        return this.nodeToChildren.add([]);
    }

    public deleteNode(node: GraphNode): void {
        FrugalList_forEach(this.nodeToParents[node], parent => {
            const parentChildren = this.nodeToChildren.get(parent);
            const parentIndex = parentChildren.lastIndexOf(node);
            parentChildren.splice(parentIndex, /* deleteCount: */ 1);
        });

        this.nodeToParents[node] = undefined;
        this.nodeToChildren.delete(node);
    }

    public spliceChildren(parent: GraphNode, start: number, removeCount: number, ...toInsert: GraphNode[]): void {
        const children = this.nodeToChildren.get(parent);

        for (let i = start; i < start + removeCount; i++) {
            this.removeParent(children[i], parent);
        }

        for (const child of toInsert) {
            this.addParent(child, parent);
        }

        children.splice(start, removeCount, ...toInsert);
        this.invalidateShape(parent, start, removeCount, toInsert.length);
    }

    // #endregion IGraphShapeWriter

    protected forEachConsumer(callback: (consumer: IGraphShapeConsumer) => void): void {
        FrugalList_forEach(this.consumers, callback);
    }

    private invalidateShape(parent: GraphNode, start: number, removedCount: number, insertCount: number): void {
        this.forEachConsumer((consumer) => {
            consumer.childrenChanged(parent, start, removedCount, insertCount, this);
        });
    }

    private addParent(child: GraphNode, parent: GraphNode) {
        this.nodeToParents[child] = FrugalList_push(this.nodeToParents[child], parent);
    }

    private removeParent(child: GraphNode, parent: GraphNode) {
        this.nodeToParents[child] = FrugalList_removeFirst(this.nodeToParents[child], parent);
    }
}
