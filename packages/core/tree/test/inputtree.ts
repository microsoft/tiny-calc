import { Tree } from "../src/tree";
import { TreeNode, ITreeWriter } from "../src/types";

export class InputTree<T> extends Tree<T> implements ITreeWriter<T> {
    private readonly values: T[] = [];
    
    // #region ITreeReader

    getNode(node: TreeNode): T {
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
