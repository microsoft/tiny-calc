import { Tree } from "../src/tree";
import { TreeNode, ITreeWriter, ITreeShapeProducer, ITreeShapeReader } from "../src/types";

export class InputTree<T> extends Tree<T> implements ITreeWriter<T> {
    private readonly values: T[] = [];
    protected readonly shape: ITreeShapeReader;

    constructor (shape: ITreeShapeProducer) {
        super();
        
        this.shape = shape.openTree(/* consumer: */ this);
    }
    
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
