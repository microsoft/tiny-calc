export const enum NodeKind {
    Interior,
    Leaf
}

export interface RopeBase<T> {
    size: number;
    readonly lengths: number[];
    readonly segments: T[];
}

export interface InteriorNode<T> extends RopeBase<AdjustNode<T>> {
    readonly kind: NodeKind.Interior;
}

export interface LeafNode<T> extends RopeBase<T> {
    readonly kind: NodeKind.Leaf;
    prev: LeafNode<T> | undefined;
    next: LeafNode<T> | undefined;
}

export interface SegmentRange<T> {
    readonly size: number;
    readonly lengths: readonly number[];
    readonly segments: readonly T[];
    readonly next: SegmentRange<T> | undefined;
    readonly prev: SegmentRange<T> | undefined;
}

export interface TreeConfiguration<T> {
    readonly emptySegment: T;
    readonly order: number;
    readonly extractSegmentRange: (segment: T, start: number, length: number) => { retained: T, removed: T };
}

export interface AdjustTree<T> {
    readonly getLength: () => number;
    readonly getItem: (position: number) => { offset: number, segment: T };
    readonly insertRange: (position: number, length: number, segment: T) => void;
    readonly deleteRange: (position: number, length: number) => SegmentRange<T>;
    // readonly mapRange: <U>(position: number, length: number, fn: (segment: T) => U) => AdjustTree<T | U>;
}

export interface AdjustTreeDebug<T> extends AdjustTree<T> {
    validate(): boolean
}

export type AdjustNode<T> = InteriorNode<T> | LeafNode<T>;

export interface TreeContext<T> {
    readonly emptySegment: T;
    readonly order: number;
    /**
     * maxKeys should be at least 2*order. This is assumed when
     * merging two undersized nodes.
     */
    readonly maxKeys: number;
    readonly interiorLengthSize: number;
    readonly interiorChidrenSize: number;
    readonly leafLengthSize: number;
    readonly leafSegmentSize: number;
    readonly extractSegmentRange: (segment: T, start: number, length: number) => { retained: T, removed: T };
}

export interface Orphan<T> {
    node: AdjustNode<T>;
    length: number;
    heightDelta: number;
}

export interface Deletion<T> {
    orphan: Orphan<T> | undefined;
    deleted: LeafNode<T>;
}

export type Insertion<T> = [number, AdjustNode<T>] | undefined;
