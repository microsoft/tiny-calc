export type Primitive = boolean | number | string;

export interface Pending<T> {
    kind: "Pending";
    estimate?: T;
}

export enum PrimordialTrait {
    None = 0,
    Numeric = 1 << 0,
    Boolean = 1 << 1,
    String = 1 << 2,
    Comparable = 1 << 3,
    Error = 1 << 4,
}

export interface CalcObj<C = void> {
    traits: () => PrimordialTrait;
    serialise: (context: C) => string;
    send: (message: string, context: C, args: unknown[] | void) => CalcValue<C> | Pending<CalcValue<C>>;
}

// export interface CalcFun<CLex = void> {
//     <CDyn extends CLex>(runtime: Runtime, context: CDyn, args: CalcValue<CDyn>[]): Delayed<CalcValue<CDyn>>;
// }

export type CalcValue<C> = Primitive | CalcObj<C> // | CalcFun<C>;

export interface ErrorTrait<C> extends CalcObj<C> {
    enrich: (message: string) => ErrorTrait<C>
}

export interface NumericTrait<C> extends CalcObj<C> {
    add: (other: CalcValue<C>, context: C) => NumericTrait<C> | ErrorTrait<C>;
    minus: (other: CalcValue<C>, context: C) => NumericTrait<C> | ErrorTrait<C>;
    times: (other: CalcValue<C>, context: C) => NumericTrait<C> | ErrorTrait<C>;
    div: (other: CalcValue<C>, context: C) => NumericTrait<C> | ErrorTrait<C>;
    negate: (context: C) => NumericTrait<C> | ErrorTrait<C>;
}

export interface ComparableTrait<C> extends CalcObj<C> {
    compare: (other: CalcValue<C>, context: C) => -1 | 0 | 1 | ErrorTrait<C>
}

export interface ReferenceTrait<C> extends CalcObj<C> {
    dereference: (context: C) => CalcValue<C> | Pending<CalcValue<C>>;
}

export enum QueryOp {
    Sum,
    Average,
    Max,
    Min,
    Product,
    Concat,
}

export interface QueryableTrait<C> extends CalcObj<C> {
    run: (op: QueryOp, context: C) => CalcValue<C> | Pending<CalcValue<C>>;
}


/**
 * The interface for an object that can bind to an IProducer.
 *
 * Any object that implements IConsumer is expected to provide a
 * callback whenever the component it is bound to changes in value and a reference
 * to the data that the consumer is bound to.
 */
export interface IConsumer<T> {
    /**
     * Invoked whenever the data this object is bound to is changed.
     */
    valueChanged<U extends T, K extends keyof U>(property: K, value: U[K], producer: IProducer<U>): void;
}

export interface IReader<T> {
    /**
     * Return the value associated with `property`.
     * @param property - The property of the Producer to read.
     */
    read<K extends keyof T>(property: K): T[K] | Pending<T[K]>;
}

/**
 * The interface for an object whose data can be bound to. We use this contract for
 * components that want to expose their data and its changes to other components.
 *
 * Any component that implements IProducer is expected to provide some registration
 * functionality and to notify consumers whenever the data they are bound to changes.
 */
export interface IProducer<T> {
    /**
     * Unsubscribes a consumer from this producer.
     * @param consumer - The consumer to unregister from the Producer.
     */
    removeConsumer(consumer: IConsumer<T>): void;

    /**
     * Returns a reader for this producer's values and implicitly subscribes the given
     * consumer to change notifications from this producer (if it isn't already).
     * 
     * @param consumer - The object to be notified of value changes.
     */
    open(consumer: IConsumer<T>): IReader<T>;
}

export interface IVectorConsumer<T> {
    /** Notification that a range of items have been inserted, removed, and/or replaced in the given vector. */
    itemsChanged(index: number, numRemoved: number, itemsInserted: T[], producer: IVectorProducer<T>): void;
}

export interface IVectorReader<T> {
    readonly length: number;
    read(index: number): T;
}

/** Provides more efficient access to 1D data for vector-aware consumers. */
export interface IVectorProducer<T> {
    /**
     * Unsubscribes a consumer from this producer.
     * @param consumer - The consumer to unregister from the Producer.
     */
    removeVectorConsumer(consumer: IVectorConsumer<T>): void;

    openVector(consumer: IVectorConsumer<T>): IVectorReader<T>;
}

export interface IMatrixConsumer<T> {
    /** Notification that rows have been inserted, removed, and/or replaced in the given matrix. */
    rowsChanged(row: number, numRemoved: number, rowsInserted: T[], producer: IMatrixProducer<T>): void;

    /** Notification that cols have been inserted, removed, and/or replaced in the given matrix. */
    colsChanged(col: number, numRemoved: number, colsInserted: T[], producer: IMatrixProducer<T>): void;

    /** Notification that a range of cells have been replaced in the given matrix. */
    cellsReplaced(row: number, col: number, numRows: number, numCols: number, values: T[], producer: IMatrixProducer<T>): void;
}

export interface IMatrixReader<T> {
    readonly numRows: number;
    readonly numCols: number;
    read(row: number, col: number): T;
}

/** Provides more efficient access to 2D data for matrix-aware consumers. */
export interface IMatrixProducer<T> {
    /**
     * Unsubscribes a consumer from this producer.
     * @param consumer - The consumer to unregister from the Producer.
     */
    removeMatrixConsumer(consumer: IMatrixConsumer<T>): void;

    openMatrix(consumer: IMatrixConsumer<T>): IMatrixReader<T>;
}
