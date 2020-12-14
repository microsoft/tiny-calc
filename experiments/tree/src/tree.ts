/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    TreeNode,
    TreeNodeLocation,
    ITreeProducer,
    ITreeConsumer,
    ITreeReader,
    ITreeShapeReader
} from "./types";
import {
    FrugalList,
    FrugalList_push,
    FrugalList_removeFirst,
    FrugalList_forEach
} from "@tiny-calc/frugallist";

export abstract class Tree<T> implements ITreeProducer<T>, ITreeReader<T>, ITreeConsumer {
    private consumers: FrugalList<ITreeConsumer>;

    protected abstract get shape(): ITreeShapeReader;

    // #region ITreeReader<T>

    public beforeNode(node: TreeNode): TreeNodeLocation        { return this.shape.beforeNode(node); }
    public afterNode(node: TreeNode): TreeNodeLocation         { return this.shape.afterNode(node); }
    public firstChildOf(node: TreeNode): TreeNodeLocation      { return this.shape.firstChildOf(node); }
    public lastChildOf(node: TreeNode): TreeNodeLocation       { return this.shape.lastChildOf(node); }

    public parentOfLocation(node: TreeNodeLocation): TreeNode  { return this.shape.parentOfLocation(node); }

    public getParent(node: TreeNode): TreeNode                 { return this.shape.getParent(node); }
    public getFirstChild(parent: TreeNode): TreeNode           { return this.shape.getFirstChild(parent); }
    public getLastChild(parent: TreeNode): TreeNode            { return this.shape.getLastChild(parent); }
    public getNextSibling(node: TreeNode): TreeNode            { return this.shape.getNextSibling(node); }
    public getPrevSibling(node: TreeNode): TreeNode            { return this.shape.getPrevSibling(node); }

    abstract getNode(node: TreeNode): T;

    // #endregion ITreeReader<T>

    // #region ITreeProducer<T>

    public openTree(consumer: ITreeConsumer): ITreeReader<T> {
        this.consumers = FrugalList_push(this.consumers, consumer);
        return this;
    }

    public closeTree(consumer: ITreeConsumer): void {
        this.consumers = FrugalList_removeFirst(this.consumers, consumer);
    }

    // #endregion ITreeProducer

    // #region ITreeConsumer

    public nodeMoved(node: TreeNode, oldLocation: TreeNodeLocation): void {
        this.invalidateNodeLocation(node, oldLocation);
    }

    public nodeChanged(node: TreeNode): void {
        this.invalidateNode(node);
    }

    // #endregion ITreeConsumer

    protected invalidateNode(node: TreeNode): void {
        FrugalList_forEach(this.consumers, (consumer) => {
            consumer.nodeChanged(node, /* producer: */ this);
        });
    }

    protected invalidateNodeLocation(node: TreeNode, oldLocation: TreeNodeLocation): void {
        FrugalList_forEach(this.consumers, (consumer) => {
            consumer.nodeMoved(node, oldLocation, /* producer: */ this);
        });
    }
}
