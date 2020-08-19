import { ITreeShapeConsumer, TreeNode, TreeNodeLocation, ITreeShapeProducer, ITreeProducer, ITreeConsumer, ITreeReader, ITreeShapeReader } from "./types";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "./consumerset";

export abstract class Tree<T> implements ITreeShapeConsumer, ITreeProducer<T>, ITreeReader<T> {
    private consumers?: ConsumerSet<ITreeConsumer>;
    protected shape: ITreeShapeReader;

    constructor (shape: ITreeShapeProducer) { 
        this.shape = shape.openTree(this);
    }

    // #region ITreeReader<T>

    beforeNode(node: TreeNode): TreeNodeLocation        { return this.shape.beforeNode(node); }
    afterNode(node: TreeNode): TreeNodeLocation         { return this.shape.afterNode(node); }
    firstChildOf(node: TreeNode): TreeNodeLocation      { return this.shape.firstChildOf(node); }
    lastChildOf(node: TreeNode): TreeNodeLocation       { return this.shape.lastChildOf(node); }
    
    parentOfLocation(node: TreeNodeLocation): TreeNode  { return this.shape.parentOfLocation(node); }

    getParent(node: TreeNode): TreeNode                 { return this.shape.getParent(node); }
    getFirstChild(parent: TreeNode): TreeNode           { return this.shape.getFirstChild(parent); }
    getLastChild(parent: TreeNode): TreeNode            { return this.shape.getLastChild(parent); }
    getNextSibling(node: TreeNode): TreeNode            { return this.shape.getNextSibling(node); }
    getPrevSibling(node: TreeNode): TreeNode            { return this.shape.getPrevSibling(node); }

    abstract getNode(node: TreeNode): T;

    // #endregion ITreeReader<T>

    // #region ITreeProducer<T>

    openTree(consumer: ITreeConsumer): ITreeReader<T> {
        this.consumers = addConsumer(this.consumers, consumer);
        return this;
    }

    closeTree(consumer: ITreeConsumer): void {
        this.consumers = removeConsumer(this.consumers, consumer);
    }

    // #endregion ITreeProducer

    // #region ITreeShapeConsumer
    
    public nodeMoved(node: TreeNode, oldLocation: TreeNodeLocation) {
        this.invalidateNodeLocation(node, oldLocation);
    }

    // #endregion ITreeShapeConsumer

    protected invalidateNode(node: TreeNode): void {
        forEachConsumer(this.consumers, (consumer) => {
            consumer.nodeChanged(node);
        });
    }

    protected invalidateNodeLocation(node: TreeNode, oldLocation: TreeNodeLocation): void {
        forEachConsumer(this.consumers, (consumer) => {
            consumer.nodeMoved(node, oldLocation);
        });
    }
}