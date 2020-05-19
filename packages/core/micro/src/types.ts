import {
    ExpressionNode,
    CalcObj,
    CalcValue,
    Primitive,
} from "@tiny-calc/nano";

export type Point = [number, number];

export interface Reference {
    row1: number;
    col1: number;
    row2?: number | undefined;
    col2?: number | undefined;
}

export type FormulaNode = ExpressionNode<string | Reference>;

/*
 * Cell Data Types
 */

/**
 * CalcFlags for Cell Status.
 */
export const enum CalcState {
    Clean,
    Dirty,
    InCalc,
    Invalid,
}

export type Value = Primitive | undefined;

export type CellValue = CalcValue<RangeContext>;

export interface ValueCell {
    state: CalcState.Clean;
    content: Primitive;
}

export enum CalcFlags {
    None = 0,
    InStack = 1 << 0,
    InChain = 1 << 1,
    PendingNotification = 1 << 2,
}

export interface FormulaCell<T> {
    state: CalcState;
    flags: CalcFlags;
    row: number;
    col: number;
    formula: string;
    value: T | undefined;
    node: FormulaNode | undefined;
}

export type FunctionRunner<A, R> = [A, (accum: unknown) => void, (finalise: A) => R];

declare const function_skolem: unique symbol;
export type FunctionSkolem = typeof function_skolem;

export interface FunctionFiber<R> {
    readonly state: FunctionTask;
    readonly range: Range;
    readonly context: RangeContext,
    flags: CalcFlags,
    row: number;
    column: number;
    readonly runner: FunctionRunner<FunctionSkolem, R>;
}

export type Cell = ValueCell | FormulaCell<CellValue>;

export type Fiber<T> = FormulaCell<T> | FunctionFiber<T>;

export type FunctionTask = "sum" | "product" | "count" | "average" | "max" | "min" | "concat";

export interface PendingTask<T> {
    kind: "Pending";
    fiber: Fiber<T>;
}

export type PendingValue = PendingTask<CalcValue<RangeContext>>;

export interface RangeContext {
    /** Cache for aggregations */
    cache: Record<string, PendingValue | CellValue | undefined>;
    origin: Point | undefined;
    read: (row: number, col: number) => CellValue | PendingTask<CellValue>;
}

export interface Range extends CalcObj<RangeContext> {
    readonly tlRow: number;
    readonly tlCol: number;
    readonly height: number;
    readonly width: number;
}

export interface Binder {
    getVolatile: () => Set<number>;
    bindCell: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
    getDependents: (row: number, col: number) => Set<number> | undefined;
    clearDependents: (row: number, col: number) => void;
    clear: () => void;
}

/**
 * IGrid denotes a 2D cache for values of type `T`.
 */
export interface IGrid<T> {
    getCell(row: number, col: number): T | undefined;
    write(row: number, col: number, value: T): void;
    // Undefined means invalid row or col.
    readOrWrite(row: number, col: number, value: () => T): T | undefined;
    clear(row: number, col: number): void;
}

/**
 * Legacy Interface
 */
export interface IMatrix {
   readonly rowCount: number;
   readonly colCount: number;
   loadCellText: (row: number, col: number) => Primitive | undefined;
   loadCellData: (row: number, col: number) => object | undefined;
   storeCellData: (row: number, col: number, value: object | undefined) => void;
}
