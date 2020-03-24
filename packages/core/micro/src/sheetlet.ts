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

import { isRange, fromReference } from "./range";

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

function assertNever(_: never): never {
    return assert.fail(`
Unreachable Expression ${JSON.stringify(_)}
Stack: ${new Error().stack}
`) as never;
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
    isDone(fiber: Fiber<CellValue>): boolean;
    readCell(row: number, col: number): Cell | undefined;
    evaluate(row: number, col: number, node: FormulaNode): Pending<unknown>[] | CalcValue<RangeContext>;
    dereference(row: number, col: number, value: CellValue): PendingValue | CalcValue<RangeContext>;
}

function rebuild(chainHead: FormulaCell<CellValue>, host: BuildHost) {
//     let chain: Fiber<CalcValue<RangeContext>> = chainHead;
// 
//     while (true) {
//         // Cell Fiber
//         if (typeof chain.flag === "number") {
//             if (chain.flag === CalcFlag.Dirty || chain.flag === CalcFlag.InCalc) {
//                 const result = evalCell(chain, host);
//                 if (typeof result === "boolean") {
//                     if (chain.next === undefined) {
//                         break;
//                     }
//                     chain = chain.next;
//                     continue;
//                 }
//                 chain = result;
//                 continue;
//             }
//             if (chain.next === undefined) {
//                 break;
//             }
//             chain = chain.next;
//             continue;
//         }
// 
//         // Function Fiber
//         chain = evalFunctionFiber((chain as Fiber<CellValue>) as FunctionFiber<CellValue>, host);
//     }
// 
//     while (chain.prev !== undefined) {
//         chain = chain.prev;
//     }
// 
//     return chain;
// 
//     function evalFunctionFiber(fiber: FunctionFiber<CellValue>, host: BuildHost) {
//         const { row, column, range } = fiber;
// 
//         if (fiber.next === undefined) {
//             return assert.fail("Function fiber should not be last in chain");
//         }
//         fiber.next.prev = fiber.prev;
//         if (fiber.prev) {
//             fiber.prev.next = fiber.next;
//         }
// 
//         let task: Fiber<CellValue> = fiber.next;
//         const startC = range.tlCol;
//         const endR = range.tlRow + range.height;
//         const endC = range.tlCol + range.width;
//         for (let j = column; j < endC; j += 1) {
//             const cell = host.readCell(row, j);
//             if (cell && (cell.flag === CalcFlag.Dirty || cell.flag === CalcFlag.InCalc)) {
//                 task = reprioritise(task, cell);
//             }
//         }
//         for (let i = row + 1; i < endR; i += 1) {
//             for (let j = startC; j < endC; j += 1) {
//                 const cell = host.readCell(i, j);
//                 if (cell && (cell.flag === CalcFlag.Dirty || cell.flag === CalcFlag.InCalc)) {
//                     task = reprioritise(task, cell);
//                 }
//             }
//         }
//         return task;
//     }
// 
//     function evalCell(cell: FormulaCell<CellValue>, host: BuildHost): true | Fiber<CellValue> {
//         if (cell.flag === CalcFlag.Clean || cell.flag === CalcFlag.CleanUnacked) {
//             return true;
//         }
//         const { parser, evaluate, dereference } = host;
//         if (cell.node === undefined) {
//             const [hasError, node] = parser(cell.formula);
//             if (hasError) {
//                 cell.flag = CalcFlag.CleanUnacked;
//                 cell.value = errors.parseFailure;
//                 return true;
//             }
//             cell.node = node;
//         }
//         cell.flag = CalcFlag.InCalc;
//         const result = evaluate(cell.row, cell.col, cell.node);
//         if (Array.isArray(result)) {
//             let fiber: Fiber<CellValue> = cell;
//             for (let i = 0; i < result.length; i++) {
//                 const p = result[i];
//                 if (isPendingTask(p)) {
//                     fiber = reprioritise(fiber, p.fiber);
//                 }
//             }
//             if (fiber === cell) {
//                 return assert.fail("Pending cell should return a fiber");
//             }
//             return fiber;
//         }
//         const dererd = dereference(cell.row, cell.col, result);
//         if (isPendingTask(dererd)) {
//             return reprioritise(cell, dererd.fiber);
//         }
//         cell.flag = CalcFlag.CleanUnacked;
//         cell.value = dererd;
//         return true;
//     }
}

export class Sheetlet implements IMatrixConsumer<Value>, IMatrixProducer<Value>, IMatrixReader<Value> {
    private static readonly blank = "";

    readonly binder = initBinder();
    readonly parser = createFormulaParser();

    chain: FormulaCell<CellValue> | undefined;
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
//         const cell = this.cache.read(row, col);
//         if (cell && isFormulaCell(cell)) {
//             if (cell.next) {
//                 cell.next.prev = cell.prev;
//             }
//             if (cell.prev) {
//                 cell.prev.next = cell.next;
//             }
//         }
//         this.cache.clear(row, col);
        dirty(row, col);
    }

    cellsChanged(row: number, col: number, numRows: number, numCols: number, values: readonly Value[] | undefined) {
        const endR = row + numRows;
        const endC = col + numCols;
        const dirty = this.createDirtier();
        for (let i = row; i < endR; i++) {
            for (let j = col; i < endC; j++) {
//                 // Remove the formula from the chain.
//                 // Remove the formula from the cache.
//                 // Dirty the formula and its deps.
//                 const cell = this.cache.read(i, j);
//                 if (cell && isFormulaCell(cell)) {
//                     if (cell.next) {
//                         cell.next.prev = cell.prev;
//                     }
//                     if (cell.prev) {
//                         cell.prev.next = cell.next;
//                     }
//                 }
                this.cache.clear(i, j);
                dirty(i, j);
            }
        }

        if (!this.consumer0) {
            return;
        }

        let newChain: Fiber<CellValue> | undefined;

        if (this.chain) {
            newChain = rebuild(
                this.chain,
                this.createBuildHost(() => false)
            );
        }

        this.consumer0!.cellsChanged(row, col, numRows, numCols, values, this);
        this.consumers.forEach(consumer => consumer.cellsChanged(row, col, numRows, numCols, values, this));

        const ack = (r: number, c: number) => {
            this.consumer0!.cellsChanged(r, c, 1, 1, undefined, this);
            this.consumers.forEach(consumer => consumer.cellsChanged(r, c, 1, 1, undefined, this));
        };

        if (newChain) {
            this.chain = this.ackChain(newChain, ack);
        }
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
            if (cell.flag !== CalcFlag.Dirty) {
                cell.flag = CalcFlag.Dirty;
                const deps = binder.getDependents(row, col);
                if (deps) {
                    deps.forEach(n => {
                        const [r, c] = keyToPoint(n)
                        runDirtier(r, c)
                    });
                }
            }
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


    createBuildHost(isDone: (f: Fiber<CellValue>) => boolean): BuildHost {
        return {
            parser: this.parser,
            isDone,
            readCell: this.readCell.bind(this),
            evaluate: (r, c, node) => {
                const [data, tracer] = makeTracer();
                const rt = new CoreRuntime(tracer);
                const result = evaluate(evalContext, this.inSheetContext([r, c]), rt, this.resolver, node);
                if (rt.isDelayed(result)) {
                    return data;
                }
                return result;
            },
            dereference: (r, c, value) => {
                if (typeof value === "object" && isRange(value)) {
                    return this.getCellValueAndLink(value.tlRow, value.tlCol, [r, c]);
                }
                return value;
            }
        };
    }

    readCell(row: number, col: number) {
        assert(this.reader, "Reader should be opened on readCell");
        let cell = this.cache.read(row, col);
        if (cell === undefined) {
            cell = makeCell(row, col, this.reader!.read(row, col));
            if (cell !== undefined) {
                // create the cell and add it to the head of the chain.
                if (isFormulaCell(cell)) {
                    cell.next = this.chain;
                    this.chain = cell;
                }
                this.cache.write(row, col, cell);
            }
        }
        return cell;
    }

    read(row: number, col: number): Value {
        const cell = this.readCell(row, col);
        if (cell === undefined) {
            return undefined;
        }
        if (cell.flag === CalcFlag.Dirty) {
            assert(this.chain, "Chain should be defined when a dirty formula exists");
            try {
                rebuild(
                    this.chain!,
                    this.createBuildHost(() => false)
                );
            } catch (e) {
                console.error(`Rebuild failure: ${e}`);
            }
        }
        if (isFormulaCell(cell)) {
            if (cell.value === undefined) {
                return undefined;
            }
            const value: CellValue = cell.value;
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
        return this.primitiveFromValue(context, result);
    }

    primitiveFromValue(context: RangeContext, value: CalcValue<RangeContext>): Value {
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
                    return isPendingTask(result) ? undefined : this.primitiveFromValue(context, result);
                }
                return value.serialise(context);
            default:
                return assertNever(value);
        }
    }

    getCellValueAndForget(row: number, col: number) {
        const cell = this.readCell(row, col);
        if (cell === undefined) {
            return Sheetlet.blank;
        }
        switch (cell.flag) {
            case CalcFlag.Clean:
            case CalcFlag.CleanUnacked:
                return isFormulaCell(cell) ? cell.value! : cell.content;

            case CalcFlag.Dirty:
                return { kind: "Pending" as const, fiber: cell };

            case CalcFlag.InCalc:
            default:
                return assertNever(cell as never);
        }
    }

    getCellValueAndLink(row: number, col: number, origin: Point) {
        const cell = this.readCell(row, col);
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
                return { kind: "Pending" as const, fiber: cell };

            case CalcFlag.InCalc:
                return errors.cycle;

            default:
                return assertNever(cell);
        }
    }
}

export const createSheetlet = (producer: IMatrixProducer<Value>, matrix: IMatrix<Cell>) =>
    new Sheetlet(producer, matrix);
