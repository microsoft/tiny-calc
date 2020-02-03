export enum PrimordialType {
    Numeric = 1, // 1 << 0
    Error = 2, // 1 << 1
    Comparable = 4, // 1 << 2
    Readable = 16, // 1 << 3
    Reference = 32 // 1 << 4
}

export interface TypeMap<C> {
    [PrimordialType.Numeric]: NumericType<C>;
    [PrimordialType.Error]: ErrorType<C>;
    [PrimordialType.Comparable]: ComparableType<C>;
    [PrimordialType.Readable]: ReadableType<C>;
    [PrimordialType.Reference]: ReferenceType<C>;
}

export type Primitive = boolean | number | string;

export interface CalcObj<C = void> {
    acquire: <T extends PrimordialType>(t: T) => TypeMap<C>[T] | undefined;
    serialise: (context: C) => string;
}

export interface CalcFun<CLex = void> {
    <CDyn extends CLex, Delay>(runtime: Runtime<Delay>, context: CDyn, args: CalcValue<CDyn>[]): CalcValue<CDyn> | Delay;
}

export type CalcValue<C = void> = Primitive | CalcObj<C> | CalcFun<C>;
export type DataValue<C> = CalcObj<C> | Primitive;

export interface ErrorType<C> {
    enrich: (message: string) => ErrorType<C>
}

export interface NumericType<C> {
    plus: (left: boolean, other: NumericType<C> | number, context: C) => CalcValue<C>;
    minus: (left: boolean, other: NumericType<C> | number, context: C) => CalcValue<C>;
    times: (left: boolean, other: NumericType<C> | number, context: C) => CalcValue<C>;
    div: (left: boolean, other: NumericType<C> | number, context: C) => CalcValue<C>;
    negate: (context: C) => CalcValue<C>;
}

export interface ComparableType<C> {
    compare: (left: boolean, other: ComparableType<C> | Primitive, context: C) => number | CalcObj<C>
}

export interface Pending<T> {
    kind: "Pending";
    estimate?: T;
}

export interface ReadableType<C> {
    read: (property: string, context: C) => CalcValue<C> | Pending<CalcValue<C>>;
}

export interface ReferenceType<C> {
    dereference: (context: C) => CalcValue<C> | Pending<CalcValue<C>>;
}

export interface TypedUnaryOp {
    type: PrimordialType,
    fn: <C>(context: C, expr: DataValue<C>) => CalcValue<C>,
    err: <C>(context: C, expr: CalcValue<C>) => CalcValue<C>,
}

export interface TypedBinOp {
    type1: PrimordialType,
    type2: PrimordialType,
    fn: <C>(context: C, l: DataValue<C>, r: DataValue<C>) => CalcValue<C>,
    err: <C>(context: C, expr: CalcValue<C>, pos: number) => CalcValue<C>,
}

/**
 * Expression runtime that implements collection and propagation
 * of potentially unavailable resources.
 */
export interface Runtime<Delay> {
//    isDelayed: (x: unknown) => x is Delay;
    read: <C, F>(context: C, receiver: CalcValue<C> | Delay, prop: string, fallback: F) => CalcValue<C> | F | Delay;
    ifS: <T>(cond: boolean | Delay, cont: (cond: boolean) => T | Delay) => T | Delay;
    app1: <C>(context: C, op: TypedUnaryOp, expr: CalcValue<C> | Delay ) => CalcValue<C> | Delay;
    app2: <C>(context: C, op: TypedBinOp, l: CalcValue<C> | Delay, r: CalcValue<C> | Delay) => CalcValue<C> | Delay;
    appN: <C, F>(context: C, fn: CalcValue<C> | Delay, args: (CalcValue<C> | Delay)[], fallback: F) => CalcValue<C> | F | Delay;
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
