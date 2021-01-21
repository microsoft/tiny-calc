/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Handle } from "@tiny-calc/handletable";

export const enum GraphNodeHandle {
    none = 0,
    root = 1,
}

export type GraphNode = Handle & { readonly GraphNode: unique symbol };

export const GraphNode: { readonly root: GraphNode, readonly none: GraphNode } = {
    get root(): GraphNode { return GraphNodeHandle.root as unknown as GraphNode },
    get none(): GraphNode { return GraphNodeHandle.none as unknown as GraphNode }
}

export interface IGraphShapeProducer {
    /**
     * Acquire a reader for this tree's shape and implicitly subscribe the consumer
     * to shape change notifications.
     *
     * @param consumer - The consumer to be notified of Graph changes.
     */
    openGraph(consumer: IGraphShapeConsumer): IGraphShapeReader;

    /**
     * Unsubscribe the consumer from this tree's shape notifications.
     *
     * @param consumer - The consumer to unregister from the Graph shape.
     */
    closeGraph(consumer: IGraphShapeConsumer): void;
}

export interface IGraphShapeConsumer {
    /** Notification that a range of children have been inserted, removed, and/or replaced in the given parent. */
    childrenChanged(parent: GraphNode, start: number, removedCount: number, insertedCount: number, producer: IGraphShapeProducer): void;
}

export interface IGraphShapeReader {
    getChild(parent: GraphNode, position: number): GraphNode;
    getChildCount(parent: GraphNode): number;
}

export interface IGraphShapeWriter {
    createNode(): GraphNode;
    deleteNode(node: GraphNode): void;
    spliceChildren(parent: GraphNode, start: number, removeCount: number, ...toInsert: GraphNode[]): void;
}

export interface IGraphProducer<T = unknown> extends IGraphShapeProducer {
    /**
     * Acquire a reader for this tree's shape and implicitly subscribe the consumer
     * to shape change notifications.
     *
     * @param consumer - The consumer to be notified of Graph changes.
     */
    openGraph(consumer: IGraphConsumer): IGraphReader<T>;

    /**
     * Unsubscribe the consumer from this tree's shape notifications.
     *
     * @param consumer - The consumer to unregister from the Graph shape.
     */
    closeGraph(consumer: IGraphConsumer): void;
}

export interface IGraphConsumer extends IGraphShapeConsumer {
    nodeChanged(node: GraphNode, producer: IGraphProducer<unknown>): void;
}

export interface IGraphReader<T> extends IGraphShapeReader {
    getNode(node: GraphNode): T;
}

export interface IGraphWriter<T> {
    setNode(node: GraphNode, value: T): void;
}
