import { Tree } from "../src/tree";
import { TreeNode, TreeNodeLocation } from "../src/types";

export abstract class BottomUpTree<T> extends Tree<T> {
    private readonly dirty: boolean[] = [true]

    protected isDirty(node: TreeNode) {
        return this.dirty[node];
    }

    protected invalidate(node: TreeNode) {
        while (!this.dirty[node]) {
            this.dirty[node] = true;
            node = this.getParent(node);
        }
    }

    public nodeMoved(node: TreeNode, oldLocation: TreeNodeLocation) {
        this.invalidate(node);
        this.invalidate(this.parentOfLocation(oldLocation));
        super.nodeMoved(node, oldLocation);
    }
}
