import { ITreeShapeProducer, ITreeShapeConsumer, ITreeShapeReader, TreeNode, TreeNodeLocation, ITreeShapeWriter } from "./types";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "./consumerset";
import { HandleTable } from "./handletable";

const enum ShapeFieldOffset {
    parent = 0,
    firstChild = 1,
    nextSibling = 2,
    lastChild = 3,
    prevSibling = 4,
    fieldCount = 5,
}

const enum TreeNodeIndex {
    none = TreeNode.none * ShapeFieldOffset.fieldCount,
}

function toIndex(node: TreeNode): TreeNodeIndex { return node * ShapeFieldOffset.fieldCount; }
function toNode(index: TreeNodeIndex): TreeNode { return index / ShapeFieldOffset.fieldCount; }

export class TreeShape implements ITreeShapeProducer, ITreeShapeReader, ITreeShapeWriter {
    private readonly shape: TreeNodeIndex[] = [
        /* root: */ TreeNodeIndex.none, TreeNodeIndex.none, TreeNodeIndex.none, TreeNodeIndex.none, TreeNodeIndex.none,
    ];

    private readonly handles = new HandleTable();
    private consumers?: ConsumerSet<ITreeShapeConsumer>;

    // #region ITreeShapeProducer

    openTree(consumer: ITreeShapeConsumer): ITreeShapeReader {
        this.consumers = addConsumer(this.consumers, consumer);
        return this;
    }

    closeTree(consumer: ITreeShapeConsumer): void {
        this.consumers = removeConsumer(this.consumers, consumer);
    }

    createNode(): TreeNode {
        const node = this.handles.allocate();
        const index = toIndex(+node);

        this.setParentIndex(index, TreeNodeIndex.none);
        this.setFirstChildIndex(index, TreeNodeIndex.none);
        this.setNextSiblingIndex(index, TreeNodeIndex.none);
        this.setLastChildIndex(index, TreeNodeIndex.none);
        this.setPrevSiblingIndex(index, TreeNodeIndex.none);
        return +node;
    }

    deleteNode(node: TreeNode) {
        this.removeNode(node);
        this.handles.free(+node);
    }

    // #endregion ITreeShapeProducer

    // #region ITreeShapeReader

    getParent(node: TreeNode): TreeNode      { return toNode(this.getParentIndex(toIndex(node))); }
    getFirstChild(node: TreeNode): TreeNode  { return toNode(this.getFirstChildIndex(toIndex(node))); }
    getLastChild(node: TreeNode): TreeNode   { return toNode(this.getLastChildIndex(toIndex(node))); }
    getNextSibling(node: TreeNode): TreeNode { return toNode(this.getNextSiblingIndex(toIndex(node))); }
    getPrevSibling(node: TreeNode): TreeNode { return toNode(this.getPrevSiblingIndex(toIndex(node))); }

    beforeNode(node: TreeNode): TreeNodeLocation {
        const prev = this.getPrevSibling(node);
        
        return prev === TreeNode.none
            ? this.firstChildOf(this.getParent(node))
            : this.afterNode(prev);
    }

    afterNode(node: TreeNode): TreeNodeLocation {
        return node as unknown as TreeNodeLocation;
    }

    firstChildOf(parent: TreeNode): TreeNodeLocation {
        return -parent;
    }

    lastChildOf(parent: TreeNode): TreeNodeLocation {
        const oldLast = this.getLastChild(parent);
        return oldLast === TreeNode.none
            ? this.firstChildOf(parent)
            : +oldLast;
    }

    parentOfLocation(location: TreeNodeLocation): TreeNode {
        return location > 0
            ? this.getParent(+location)
            : -location;
    }

    // #endregion ITreeShapeReader

    private getParentIndex(node: TreeNodeIndex): TreeNodeIndex      { return this.shape[node + ShapeFieldOffset.parent]; }
    private getFirstChildIndex(node: TreeNodeIndex): TreeNodeIndex  { return this.shape[node + ShapeFieldOffset.firstChild]; }
    private getLastChildIndex(node: TreeNodeIndex): TreeNodeIndex   { return this.shape[node + ShapeFieldOffset.lastChild]; }
    private getNextSiblingIndex(node: TreeNodeIndex): TreeNodeIndex { return this.shape[node + ShapeFieldOffset.nextSibling]; }
    private getPrevSiblingIndex(node: TreeNodeIndex): TreeNodeIndex { return this.shape[node + ShapeFieldOffset.prevSibling]; }

    private setParentIndex(node: TreeNodeIndex, parent: TreeNodeIndex)       { this.shape[node + ShapeFieldOffset.parent] = parent; }
    private setFirstChildIndex(parent: TreeNodeIndex, child: TreeNodeIndex)  { this.shape[parent + ShapeFieldOffset.firstChild] = child; }
    private setLastChildIndex(parent: TreeNodeIndex, child: TreeNodeIndex)   { this.shape[parent + ShapeFieldOffset.lastChild] = child; }
    private setPrevSiblingIndex(node: TreeNodeIndex, sibling: TreeNodeIndex) { this.shape[node + ShapeFieldOffset.prevSibling] = sibling; }
    private setNextSiblingIndex(node: TreeNodeIndex, sibling: TreeNodeIndex) { this.shape[node + ShapeFieldOffset.nextSibling] = sibling; }

    private unlink(node: TreeNodeIndex): TreeNodeLocation {
        const oldParent = this.getParentIndex(node);
        const oldNext = this.getNextSiblingIndex(node);
        const oldPrev = this.getPrevSiblingIndex(node);

        if (this.getFirstChildIndex(oldParent) === node) {
            this.setFirstChildIndex(oldParent, oldNext);
        }

        if (this.getLastChildIndex(oldParent) === node) {
            this.setLastChildIndex(oldParent, oldPrev);
        }

        if (oldNext !== TreeNodeIndex.none) {
            this.setPrevSiblingIndex(oldNext, oldPrev);
        }

        if (oldPrev === TreeNodeIndex.none) {
            return this.firstChildOf(toNode(oldParent));
        } else {
            this.setNextSiblingIndex(oldPrev, oldNext);
            return +toNode(oldPrev);
        }
    }

    private linkAfter(node: TreeNodeIndex, prev: TreeNodeIndex) {
        const newParent = this.getParentIndex(prev);
        this.setParentIndex(node, newParent);
        if (this.getLastChildIndex(newParent) === prev) {
            this.setLastChildIndex(newParent, node);
        }

        const next = this.getNextSiblingIndex(prev);
        this.setNextSiblingIndex(node, next);
        if (next !== TreeNodeIndex.none) {
            this.setPrevSiblingIndex(next, node);
        }

        this.setPrevSiblingIndex(node, prev);
        this.setNextSiblingIndex(prev, node);
    }

    private linkFirstChild(node: TreeNodeIndex, parent: TreeNodeIndex) {
        this.setParentIndex(node, parent);

        const next = this.getFirstChildIndex(parent);
        if (next === TreeNodeIndex.none) {
            this.setLastChildIndex(parent, node);
        } else {
            this.setPrevSiblingIndex(next, node);
        }

        this.setPrevSiblingIndex(node, TreeNodeIndex.none);
        this.setNextSiblingIndex(node, next);
        this.setFirstChildIndex(parent, node);
    }

    // #region ITreeShapeWriter

    public moveNode(node: TreeNode, location: TreeNodeLocation) {
        const index = toIndex(node);
        const oldLocation = this.unlink(index);
        
        if (location > 0) {
            this.linkAfter(index, toIndex(+location));
        } else {
            this.linkFirstChild(index, toIndex(-location));
        }

        forEachConsumer(this.consumers, (consumer) => {
            consumer.nodeMoved(node, oldLocation, /* producer: */ this);
        });
    }

    public removeNode(node: TreeNode) {
        const index = toIndex(node);
        const oldLocation = this.unlink(index);

        this.setParentIndex(index, TreeNodeIndex.none);
        this.setNextSiblingIndex(index, TreeNodeIndex.none);
        this.setPrevSiblingIndex(index, TreeNodeIndex.none);

        forEachConsumer(this.consumers, (consumer) => {
            consumer.nodeMoved(node, oldLocation, /* producer: */ this);
        });
    }
    
    // #endregion
}
