/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GraphNode, IGraphConsumer, IGraphProducer, IGraphReader, IGraphWriter } from "./types";
import { GraphShape } from "./graphshape";

export class Graph<T> extends GraphShape implements IGraphProducer<T>, IGraphReader<T>, IGraphWriter<T> {
    private readonly nodeToValue: T[] = [];

    // #region IGraphProducer

    public openGraph(consumer: IGraphConsumer): IGraphReader<T> {
        super.openGraph(consumer);
        return this;
    }

    public closeGraph(consumer: IGraphConsumer): void {
        super.closeGraph(consumer);
    }

    // #endregion IGraphProducer

    // #region IGraphReader

    public getNode(node: GraphNode): T {
        return this.nodeToValue[node];
    }

    // #endregion IGraphReader

    // #region IGraphWriter

    public setNode(node: GraphNode, value: T): void {
        this.nodeToValue[node] = value;
        this.invalidateNode(node);
    }

    // #endregion IGraphWriter

    private invalidateNode(node: GraphNode) {
        this.forEachConsumer((consumer) => (consumer as IGraphConsumer).nodeChanged(node, this));
    }
}
