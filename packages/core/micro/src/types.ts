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
export const enum CalcFlag {
    Clean,
    Dirty,
    Enqueued,
    InCalc,
}

export type CellValue = CalcValue<RangeContext>;

export interface ValueCell {
    flag: CalcFlag.Clean;
    content: Primitive;
}

export interface FormulaCell {
    flag: CalcFlag;
    content: string;
    value: CellValue | undefined;
    fn: FormulaNode | undefined;
    prev: FormulaCell | undefined;
    next: FormulaCell | undefined;
}

export type Cell = ValueCell | FormulaCell;

export type Fiber<T = unknown> = FormulaCell | FunctionFiber<T>;

export type FunctionTask = "sum" | "product" | "count" | "average" | "max" | "min" | "concat";

export interface FunctionFiber<T = unknown> {
    flag: FunctionTask;
    range: Range;
    row: number;
    column: number;
    current: T;
}

export interface PendingValue {
    kind: "Pending";
    fiber: Fiber;
}

export interface RangeContext {
    origin: Point | undefined;
    read: (row: number, col: number) => CalcValue<RangeContext> | PendingValue;
}

export interface Range extends CalcObj<RangeContext> {
    readonly tlRow: number;
    readonly tlCol: number;
    readonly height: number;
    readonly width: number;
}

/**
 * IMatrix denotes a 2D cache for values of type `T`.
 */
export interface IMatrix<T> {
    read(row: number, col: number): T | undefined;
    write(row: number, col: number, value: T): void;
    clear(row: number, col: number): void;
}
