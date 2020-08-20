export const enum TreeNode {
    none = -429496729,      // Largest negative Int32 that satisfies 'TreeNodeIndex.none / ShapeFieldOffset.fieldCount'.
    root = 0,
}

export const enum TreeNodeLocation {}

export interface ITreeShapeConsumer {
    nodeMoved(node: TreeNode, oldLocation: TreeNodeLocation): void;
}

export interface ITreeShapeProducer {
    /**
     * Acquire a reader for this tree's shape and implicitly subscribe the consumer
     * to shape change notifications.
     * 
     * @param consumer - The consumer to be notified of Tree changes.
     */
    openTree(consumer: ITreeShapeConsumer): ITreeShapeReader;

    /**
     * Unsubscribe the consumer from this tree's shape notifications.
     * 
     * @param consumer - The consumer to unregister from the Tree shape.
     */
    closeTree(consumer: ITreeShapeConsumer): void;
}

export interface ITreeShapeReader {
    beforeNode(node: TreeNode): TreeNodeLocation;
    afterNode(node: TreeNode): TreeNodeLocation;
    firstChildOf(node: TreeNode): TreeNodeLocation;
    lastChildOf(node: TreeNode): TreeNodeLocation;
    parentOfLocation(location: TreeNodeLocation): TreeNode;

    /** The parent of the given 'node', or `TreeNode.null` if detached. */
    getParent(node: TreeNode): TreeNode;

    /** The first child of the given 'parent', or `TreeNode.null` if none.  (Leaf nodes return `TreeNode.null`.) */
    getFirstChild(parent: TreeNode): TreeNode;

    /** The last child of the given 'parent', or `TreeNode.null` if none.  (Leaf nodes return `TreeNode.null`.) */
    getLastChild(parent: TreeNode): TreeNode;

    /** The next sibling of the given 'node', or `TreeNode.null` if none. */
    getNextSibling(node: TreeNode): TreeNode;

    /** The previous sibling of the given 'node', or `TreeNode.null` if none. */
    getPrevSibling(node: TreeNode): TreeNode;
}

export interface ITreeShapeWriter {
    moveNode(parent: TreeNode, newlocation: TreeNodeLocation): void;
}

export interface ITreeConsumer extends ITreeShapeConsumer {
    nodeChanged(node: TreeNode): void;
}

export interface ITreeReader<T> extends ITreeShapeReader {
    getNode(node: TreeNode): T;
}

export interface ITreeWriter<T> {
    setNode(node: TreeNode, value: T): void;
}

export interface ITreeProducer<T> {
    /**
     * Acquire a reader for this tree's shape and implicitly subscribe the consumer
     * to shape change notifications.
     * 
     * @param consumer - The consumer to be notified of Tree changes.
     */
    openTree(consumer: ITreeConsumer): ITreeReader<T>;

    /**
     * Unsubscribe the consumer from this tree's shape notifications.
     * 
     * @param consumer - The consumer to unregister from the Tree shape.
     */
    closeTree(consumer: ITreeConsumer): void;
}
