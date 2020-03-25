/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CalcValue,
    CoreRuntime,
    evalContext,
    evaluate,
    makeTracer,
    Parser,
    Pending,
    Primitive,
    Resolver,
    IMatrixConsumer,
    IMatrixProducer,
    IMatrixReader
} from "@tiny-calc/nano";

import { initBinder } from "./binder";

import { errors, isPendingTask } from "./core";

import { createFormulaParser } from "./formula";

import { funcs } from "./functions";

import { keyToPoint } from "./key";

import { isRange, fromReference, runFunc } from "./range";

import {
    CalcFlag,
    Cell,
    CellValue,
    Fiber,
    FormulaCell,
    FormulaNode,
    FunctionFiber,
    IMatrix,
    PendingValue,
    Point,
    RangeContext,
    Reference,
    Value,
    ValueCell
} from "./types";

import * as assert from "assert";

function assertNever(_: never) {
    return assert.fail(`
Unreachable Expression ${JSON.stringify(_)}
Stack: ${new Error().stack}
`);
}

const ROW = 0 as const;
const COL = 1 as const;

function valueCell(content: Primitive): ValueCell {
    return { flag: CalcFlag.Clean, content };
}

function isFormulaCell(cell: Cell): cell is FormulaCell<CellValue> {
    return "formula" in cell;
}

function makeValueCell(value: Primitive) {
    let content: Primitive;
    switch (typeof value) {
        case "number":
        case "boolean":
            content = value;
            break;
        case "string":
            content = parseValue(value);
            break;
        default:
            return assertNever(value);
    }
    return valueCell(content);
}

function makeFormulaCell(row: number, col: number, text: string): FormulaCell<CellValue> {
    return {
        flag: CalcFlag.Dirty,
        row,
        col,
        formula: text,
        value: undefined,
        node: undefined,
    };
}

function makeCell(row: number, col: number, value: Value) {
    if (value === undefined || value === "") {
        return undefined;
    }
    if (typeof value === "string" && value[0] === "=") {
        return makeFormulaCell(row, col, value.substring(1));
    }
    return makeValueCell(value);
}

function parseValue(value: string): Primitive {
    const upper = value.toUpperCase();
    if (upper === "TRUE") {
        return true;
    }
    if (upper === "FALSE") {
        return false;
    }
    const asNumber = Number(value);
    return isNaN(asNumber) ? value : asNumber;
}

interface BuildHost {
    parser: Parser<boolean, FormulaNode>;
    readCache(row: number, col: number): Cell | undefined;
    evaluate(row: number, col: number, node: FormulaNode): Pending<unknown>[] | CalcValue<RangeContext>;
    dereference(row: number, col: number, value: CellValue): PendingValue | CalcValue<RangeContext>;
}

function rebuild(chain: FormulaCell<CellValue>[], host: BuildHost): FormulaCell<CellValue>[] {
    const outChain: FormulaCell<CellValue>[] = [];
    const dynamicFibers: Fiber<CellValue>[] = [];
    
    while (chain.length !== 0 || dynamicFibers.length !== 0) {
        const fiber = dynamicFibers.pop() || chain.pop()!;
        if (typeof fiber.flag === "number") {
            switch (fiber.flag) {
                case CalcFlag.Clean:
                case CalcFlag.CleanUnacked:
                    outChain.push(fiber);
                    continue;
                    
                case CalcFlag.Dirty:
                    const result = evalCell(fiber, host);
                    if (result === true) {
                        outChain.push(fiber);
                        continue;
                    }
                    dynamicFibers.push(fiber)
                    result.forEach(f => dynamicFibers.push(f.fiber));
                    continue;
                
                case CalcFlag.Invalid:
                    // read from the cache. if it's the same cell then we clear cache and read again.

                case CalcFlag.InCalc:
                    return assert.fail("Cells in the main chain should not be in-calc");
            }
        }
        
        /**
         * 1. Run the function.
         * 2. If there are any pending values then push the function, then push the cells.
         * 3. Loop again.
         */

        /* 1 */
        const result = runFunc(fiber as FunctionFiber<CellValue>);
        if (!isPendingTask(result)) {
            continue;
        }

        /* 2 */
        dynamicFibers.push(fiber)

        /* 3 */
        const { row, column, range } = result.fiber;
        const startC = range.tlCol;
        const endR = range.tlRow + range.height;
        const endC = range.tlCol + range.width;
        for (let j = column; j < endC; j += 1) {
            const cell = host.readCache(row, j);
            // TODO: queue;
        }
        for (let i = row + 1; i < endR; i += 1) {
            for (let j = startC; j < endC; j += 1) {
                const cell = host.readCache(i, j);
                // TODO: queue
            }
        }
    }
    
    return outChain;

    function evalCell(cell: FormulaCell<CellValue>, host: BuildHost): true | PendingValue[] {
        const { parser, evaluate, dereference } = host;
        if (cell.node === undefined) {
            const [hasError, node] = parser(cell.formula);
            if (hasError) {
                cell.flag = CalcFlag.Clean; // TODO: ack?
                cell.value = errors.parseFailure;
                return true;
            }
            cell.node = node;
        }
        cell.flag = CalcFlag.InCalc;
        const result = evaluate(cell.row, cell.col, cell.node);
        if (Array.isArray(result)) {
            return result.filter(isPendingTask);
        }
        const nonRange = dereference(cell.row, cell.col, result);
        if (isPendingTask(nonRange)) {
            return [nonRange];
        }
        cell.flag = CalcFlag.Clean // TODO: ack;
        cell.value = nonRange;
        return true;
    }
}

export class Sheetlet implements IMatrixConsumer<Value>, IMatrixProducer<Value>, IMatrixReader<Value> {
    private static readonly blank = "";

    readonly binder = initBinder();
    readonly parser = createFormulaParser();

    chain: FormulaCell<CellValue>[] = [];
    reader: IMatrixReader<Value> | undefined;
    numRows: number = -1;
    numCols: number = -1;
    consumer0: IMatrixConsumer<Value> | undefined;
    consumers: IMatrixConsumer<Value>[] = [];

    readonly resolver: Resolver<RangeContext, string | Reference, never> = {
        resolve(context, ref, failure) {
            if (typeof ref === "string") {
                if (ref in funcs) {
                    return funcs[ref];
                }
                switch (ref) {
                    case "row":
                    case "ROW":
                        return context.origin ? context.origin[ROW] + 1 : errors.unknownField;
                    case "column":
                    case "COLUMN":
                        return context.origin ? context.origin[COL] + 1 : errors.unknownField;
                    default:
                        return failure;
                }
            }
            return fromReference(ref);
        }
    };

    constructor(readonly producer: IMatrixProducer<Value>, readonly cache: IMatrix<Cell>) { }

    connect() {
        this.reader = this.producer.openMatrix(this);
        this.numRows = this.reader.numRows;
        this.numCols = this.reader.numCols;
        return this;
    }

    rowsChanged(row: number, numRemoved: number, numInserted: number) {
        assert(this.reader, "Reader should be opened on rowsChanged");
        this.numRows = this.reader!.numRows;
        if (this.consumer0) {
            this.consumer0.rowsChanged(row, numRemoved, numInserted, this);
            this.consumers.forEach(consumer => consumer.rowsChanged(row, numRemoved, numInserted, this));
        }
    }

    colsChanged(col: number, numRemoved: number, numInserted: number) {
        assert(this.reader, "Reader should be opened on colsChanged");
        this.numCols = this.reader!.numCols;
        if (this.consumer0) {
            this.consumer0.colsChanged(col, numRemoved, numInserted, this);
            this.consumers.forEach(consumer => consumer.colsChanged(col, numRemoved, numInserted, this));
        }
    }

    invalidate(row: number, col: number) {
        const dirty = this.createDirtier();
        const formula = dirty(row, col);
        if (formula) {
            formula.flag = CalcFlag.Invalid;
        }
        else {
            this.cache.clear(row, col);
        }
    }

    cellsChanged(row: number, col: number, numRows: number, numCols: number, values: readonly Value[] | undefined) {
        const endR = row + numRows;
        const endC = col + numCols;
        const dirty = this.createDirtier();
        for (let i = row; i < endR; i++) {
            for (let j = col; i < endC; j++) {
                const formula = dirty(i, j);
                if (formula) {
                    formula.flag = CalcFlag.Invalid;
                }
                else {
                    this.cache.clear(row, col);
                }
            }
        }
        if (!this.consumer0) {
            return;
        }
        this.chain = rebuild(this.chain, this);
        this.consumer0!.cellsChanged(row, col, numRows, numCols, values, this);
        this.consumers.forEach(consumer => consumer.cellsChanged(row, col, numRows, numCols, values, this));
    }

    openMatrix(consumer: IMatrixConsumer<Value>): IMatrixReader<Value> {
        if (this.consumer0) {
            if (this.consumers.indexOf(consumer) === -1) {
                this.consumers.push(consumer);
            }
        } else {
            this.consumer0 = consumer;
        }
        return this.connect();
    }

    removeMatrixConsumer(consumer: IMatrixConsumer<Value>) {
        if (consumer === this.consumer0) {
            this.consumer0 = this.consumers.pop();
            return;
        } else if (this.consumer0) {
            const idx = this.consumers.indexOf(consumer);
            if (idx > -1) {
                this.consumers.splice(idx, 1);
            }
        }
    }

    createDirtier() {
        const { cache, binder } = this;
        function runDirtier(row: number, col: number) {
            const cell = cache.read(row, col);
            if (cell === undefined || !isFormulaCell(cell)) {
                const deps = binder.getDependents(row, col);
                if (deps) {
                    deps.forEach(n => {
                        const [r, c] = keyToPoint(n)
                        runDirtier(r, c)
                    });
                }
                return;
            }
            if (cell.flag !== CalcFlag.Dirty && cell.flag !== CalcFlag.Invalid) {
                cell.flag = CalcFlag.Dirty;
                const deps = binder.getDependents(row, col);
                if (deps) {
                    deps.forEach(n => {
                        const [r, c] = keyToPoint(n)
                        runDirtier(r, c)
                    });
                }
            }
            return cell;
        }
        return runDirtier;
    }

    inSheetContext(origin: Point): RangeContext {
        return {
            origin,
            cache: {},
            read: (row, col) => this.getCellValueAndLink(row, col, origin)
        }
    }

    outOfSheetContext(): RangeContext {
        return {
            origin: undefined,
            cache: {},
            read: (row, col) => this.getCellValueAndForget(row, col)
        };
    }

    evaluate(row: number, col: number, node: FormulaNode) {
        const [data, tracer] = makeTracer();
        const rt = new CoreRuntime(tracer);
        const result = evaluate(evalContext, this.inSheetContext([row, col]), rt, this.resolver, node);
        return rt.isDelayed(result) ? data : result;
    }

    dereference(row: number, col: number, value: CellValue) {
        if (typeof value === "object" && isRange(value)) {
            return this.getCellValueAndLink(value.tlRow, value.tlCol, [row, col]);
        }
        return value;
    }

    readCache(row: number, col: number) {
        assert(this.reader, "Reader should be opened on readCell");
        let cell = this.cache.read(row, col);
        if (cell === undefined) {
            cell = makeCell(row, col, this.reader!.read(row, col));
            if (cell !== undefined) {
                if (isFormulaCell(cell)) {
                    this.chain.push(cell)
                }
                this.cache.write(row, col, cell);
            }
        }
        return cell;
    }

    read(row: number, col: number): Value {
        const cell = this.readCache(row, col);
        if (cell === undefined) {
            return undefined;
        }
        if (cell.flag === CalcFlag.Dirty) {
            assert(this.chain, "Chain should be defined when a dirty formula exists");
            try {
                rebuild(
                    this.chain,
                    this,
                );
            } catch (e) {
                console.error(`Rebuild failure: ${e}`);
            }
        }
        if (isFormulaCell(cell)) {
            if (cell.value === undefined) {
                return undefined;
            }
            const value = cell.value;
            switch (typeof value) {
                case "number":
                case "string":
                case "boolean":
                    return value;
                case "function":
                    return "<function>";
                case "object":
                    const context = this.inSheetContext([row, col]);
                    return value.serialise(context);
                default:
                    return assertNever(value);
            }
        }
        return cell.content;
    }

    /**
     * Evaluate a formula string that can start with or without
     * '='. The resulting formula evaluates in the context of the
     * whole sheet and creates no dependencies to the sheet (TODO). We
     * assume that these formulas are run over clean sheets and will
     * not calc dirty cells on demand. We return `undefined` if we
     * encounter anything dirty during calc.
     */
    evaluateFormula(formula: string): Value {
        const [hasError, node] = this.parser(formula);
        if (hasError) {
            return errors.parseFailure.serialise(undefined);
        }
        const [, tracer] = makeTracer();
        const rt = new CoreRuntime(tracer);
        const context = this.outOfSheetContext()
        const result = evaluate(evalContext, context, rt, this.resolver, node);
        if (rt.isDelayed(result)) {
            return undefined;
        }
        return this.primitiveFromValue(result);
    }

    primitiveFromValue(value: CalcValue<RangeContext>): Value {
        const context = this.outOfSheetContext();
        switch (typeof value) {
            case "number":
            case "string":
            case "boolean":
                return value;
            case "function":
                return "<function>";
            case "object":
                if (isRange(value)) {
                    const result = context.read(value.tlRow, value.tlCol);
                    return isPendingTask(result) ? undefined : this.primitiveFromValue(result);
                }
                return value.serialise(context);
            default:
                return assertNever(value);
        }
    }

    getCellValueAndForget(row: number, col: number) {
        const cell = this.readCache(row, col);
        if (cell === undefined) {
            return Sheetlet.blank;
        }
        switch (cell.flag) {
            case CalcFlag.Clean:
            case CalcFlag.CleanUnacked:
                return isFormulaCell(cell) ? cell.value! : cell.content;

            case CalcFlag.Dirty:
            case CalcFlag.Invalid:
                return { kind: "Pending" as const, fiber: cell };

            case CalcFlag.InCalc:
                return errors.calc;
                
            default:
                return assertNever(cell as never);
        }
    }

    getCellValueAndLink(row: number, col: number, origin: Point) {
        const cell = this.readCache(row, col);
        if (cell === undefined) {
            this.binder.bindCell(row, col, origin[ROW], origin[COL]);
            return Sheetlet.blank;
        }
        switch (cell.flag) {
            case CalcFlag.Clean:
            case CalcFlag.CleanUnacked:
                this.binder.bindCell(row, col, origin[ROW], origin[COL]);
                return isFormulaCell(cell) ? cell.value! : cell.content;

            case CalcFlag.Dirty:
            case CalcFlag.Invalid:
                return { kind: "Pending" as const, fiber: cell };

            case CalcFlag.InCalc:
                return errors.cycle;

            default:
                return assertNever(cell);
        }
    }
}

export const createSheetlet = (producer: IMatrixProducer<Value>, matrix: IMatrix<Cell>) => new Sheetlet(producer, matrix);
