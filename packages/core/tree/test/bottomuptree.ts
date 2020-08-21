import { Tree } from "../src/tree";
import { TreeNode, TreeNodeLocation, ITreeReader, ITreeProducer } from "../src/types";

export abstract class BottomUpTree<TIn, TOut> extends Tree<TOut> {
    private readonly dirty: boolean[] = [true];
    private readonly input: ITreeReader<TIn>;
    private readonly results: TOut[] = [];

    constructor (input: ITreeProducer<TIn>) {
        super();

        this.input = input.openTree(/* consumer: */ this);
    }

    protected get shape() { return this.input; }

    protected abstract evalNode(node:TreeNode, input: ITreeReader<TIn>, descendants: ITreeReader<TOut>): TOut;

    // #region ITreeReader

    public getNode(node: TreeNode): TOut {
        if (this.isDirty(node)) {
            const result = this.results[node] = this.evalNode(node, /* input: */ this.input, /* descendants */ this);
            this.clearDirty(node);
            return result;
        } else {
            return this.results[node];
        }
    }

    // #endregion ITreeWriter

    protected isDirty(node: TreeNode) {
        return this.dirty[node] !== false;
    }

    protected clearDirty(node: TreeNode) {
        this.dirty[node] = false;
    }

    protected invalidate(node: TreeNode) {
        while (!this.dirty[node]) {
            this.dirty[node] = true;
            node = this.getParent(node);
        }
    }

    // #region ITreeConsumer

    public nodeChanged(node: TreeNode): void {
        this.invalidate(node);

        super.nodeChanged(node);
    }

    public nodeMoved(node: TreeNode, oldLocation: TreeNodeLocation) {
        this.invalidate(node);
        this.invalidate(this.parentOfLocation(oldLocation));

        super.nodeMoved(node, oldLocation);
    }

    // #endregion ITreeConsumer
}
