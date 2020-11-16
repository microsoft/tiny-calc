/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Tree, TreeNode, ITreeWriter, ITreeShapeProducer, ITreeShapeReader } from "../src";

export class InputTree<T> extends Tree<T> implements ITreeWriter<T> {
    private readonly values: T[] = [];
    protected readonly shape: ITreeShapeReader;

    public constructor (shape: ITreeShapeProducer) {
        super();

        this.shape = shape.openTree(/* consumer: */ this);
    }

    // #region ITreeReader

    public getNode(node: TreeNode): T {
        return this.values[node];
    }

    // #endregion ITreeReader

    // #region ITreeWriter

    public setNode(node: TreeNode, value: T): void {
        this.values[node] = value;
        this.invalidateNode(node);
    }

    // #endregion ITreeWriter
}
