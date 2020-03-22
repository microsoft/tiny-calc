/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CalcObj,
    CalcValue,
    compile,
    CoreRuntime,
    Delay,
    Delayed,
    evalContext,
    evaluate,
    makeTracer,
    Parser,
    Pending,
    Primitive,
    ReadableType,
    Resolver,
    Runtime,
    TypeName,
    IMatrixConsumer,
    IMatrixProducer,
    IMatrixReader,
} from "@tiny-calc/nano";

import { initBinder } from "./binder";

import {
    errors,
    isPending,
    isPendingTask,
} from "./core";

import {
    createFormulaParser
} from "./formula";

import { funcs } from "./functions";

import {
    isRange,
    fromReference,
} from "./range";

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
    ValueCell,
} from "./types";

import { keyToPoint, pointToKey } from "./key";

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

function isFormulaCell(cell: Cell): cell is FormulaCell {
    return "fn" in cell;
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

function makeFormulaCell(row: number, col: number, text: string): FormulaCell {
    return {
        flag: CalcFlag.Dirty,
        row, col,
        formula: text,
        value: undefined,
        node: undefined,
        prev: undefined,
        next: undefined
    };
}

function makeCell(row: number: col: number, value: Value) {
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
    if (upper === "TRUE") { return true; }
    if (upper === "FALSE") { return false; }
    const asNumber = Number(value);
    return isNaN(asNumber) ? value : asNumber;
}

interface BuildHost {
    parser: Parser<boolean, FormulaNode>;
    evaluate(row: number, col: number, node: FormulaNode): Pending<unknown>[] | CalcValue<RangeContext>;
}

const coerceResult = (value: CellValue, context: RangeContext) => {
    if (typeof value === "object" && isRange(value)) {
        return context.read(value.tlRow, value.tlCol);
    }
    return value;
}

function reprioritise(head: FormulaCell, task: Fiber<CalcValue<RangeContext>>): Fiber<CalcValue<RangeContext>> {
    if (head.prev === undefined) {
        head.prev = task;
        return task;
    }
    head.prev.next = task;
    head.prev = task;
    return task;
}

/**
 * Recalc `sheet`, starting from the edited `roots`.
 */
function rebuild(chainHead: FormulaCell, host: BuildHost) {
    let chain: Fiber<CalcValue<RangeContext>> | undefined = chainHead;

    while (chain) {
        switch (typeof chain.flag) {
            case "string":

            case "number":
                if (flag === CalcFlag.Dirty) {
                    const result = evalCell
                }

        }
        chain = chain.next;
    }


    function runCellFiber(fiber: FormulaCell) {
        const { row, column } = fiber;
        const cell = host.readCell(row, column);
        if (cell === undefined || !isFormulaCell(cell)) {
            return assertNever(cell as never);
        }
        const result = evalCell(row, column, cell);
        if (result !== true) {
            addFiber(fiber);
            result.forEach((pending: unknown) => {
                if (isFiber(pending)) {
                    addFiber(pending);
                }
            });
        }
        return;
    }

    function runFunctionFiber<T>(fiber: FunctionFiber<T>) {
        const { row, column, range } = fiber;
        const startC = range.tlCol
        const endR = range.tlRow + range.height;
        const endC = range.tlCol + range.width;
        for (let j = column; j < endC; j += 1) {
            if (shouldQueueFiber(host, row, j)) {
                addFiber(makePendingCell(row, j));
            }
        }
        for (let i = row + 1; i < endR; i += 1) {
            for (let j = startC; j < endC; j += 1) {
                if (shouldQueueFiber(host, i, j)) {
                    addFiber(makePendingCell(i, j));
                }
            }
        }
    }

    function evalCell(cell: FormulaCell, host: BuildHost): true | Pending<unknown>[] {
        const { parser, evaluate } = host;
        if (cell.flag === CalcFlag.Clean) {
            return true;
        }
        if (cell.node === undefined) {
            const [ok, node] = parser(cell.formula);
            if (ok) {
                cell.node = node;
            }
            else {
                cell.flag = CalcFlag.Clean;
                cell.value = errors.parseFailure;
                return true;
            }
            return true;
        }
        cell.flag = CalcFlag.InCalc;
        const result = evaluate(cell.row, cell.col, cell.node);
        if (Array.isArray(result)) {
            return result
        }
        cell.flag = CalcFlag.Clean;
        cell.value = result; // TODO: coercion.
        return true;

        // const context = host.makeContext([row, col]);
        // let result: [PendingTask[], Delayed<CellValue>] = [[], errors.evalFailure];
        // try {
        //     result = cell.node<RangeContext>(context, host.rootObject);
        // } catch {
        // }
        // if (isDelayed(result[1])) {
        //     return result[0];
        // }
        // const value = coerceResult(result[1], context);
        // if (isPending(value)) { return [value]; }
        // finishCell(queueKey, host.binder, row, col, cell, value);
        // return true;
    }

    const lookupTable = {
        [FiberKind.Cell]: runCellFiber,
        [FiberKind.Function]: runFunctionFiber,
    } as const;

    while (chain !== undefined) {
        const fiber = dynamicFibers.pop() || queue.pop()!;
        lookupTable[fiber.task](fiber as any);
    }
}

export class Sheetlet implements IMatrixConsumer<Value>, IMatrixProducer<Value>, IMatrixReader<Value> {
    private static readonly blank = "";

    readonly binder = initBinder();
    readonly parser = createFormulaParser();

    chain: FormulaCell | undefined;
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

    private readonly orphanFormulaContext: CalcObj<RangeContext> & ReadableType<CalcObj<RangeContext>, RangeContext> = {
        typeMap() {
            return {
                [TypeName.Readable]: this
            }
        },
        serialise: () => "TODO",
        read: (_: CalcObj<RangeContext>, message: string) => {
            if (message in funcs) {
                return funcs[message];
            }
            const range = tryParseRange(this.outOfSheetContext, message);
            return range || errors.unknownField;
        },
    };

    private readonly inSheetContext: (origin: Point) => RangeContext = origin => ({
        origin,
        read: (row, col) => this.getCellValueAndLink(row, col, origin),
    });

    private readonly outOfSheetContext: RangeContext = {
        origin: undefined,
        read: this.getCellValueAndForget.bind(this),
        parseRef: this.parseRef.bind(this),
    };

    private readonly invalidateKey = createInvalidator({
        readCell: this.cache.read.bind(this.cache),
    }, this.binder);


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
            this.consumers.forEach(consumer => consumer.rowsChanged(row, numRemoved, numInserted, this))
        }
    }

    colsChanged(col: number, numRemoved: number, numInserted: number) {
        assert(this.reader, "Reader should be opened on colsChanged");
        this.numCols = this.reader!.numCols;
        if (this.consumer0) {
            this.consumer0.colsChanged(col, numRemoved, numInserted, this);
            this.consumers.forEach(consumer => consumer.colsChanged(col, numRemoved, numInserted, this))
        }
    }

    cellsChanged(row: number, col: number, numRows: number, numCols: number, values: readonly (Value)[] | undefined) {
        const endR = row + numRows;
        const endC = col + numCols;
        const dirty = this.createDirtier();
        for (let i = row; i < endR; i++) {
            for (let j = col; i < endC; j++) {
                this.cache.clear(i, j);
                dirty(i, j);
            }
        }

        const host: BuildHost = {
            parser: this.parser,
            evaluate: (r, c, node) => {
                const [data, tracer] = makeTracer();
                const rt = new CoreRuntime(tracer);
                const resolver = this.resolver;
                const result = evaluate(evalContext, this.inSheetContext([r, c]), rt, resolver, node);
                if (rt.isDelayed(result)) {
                    return data;
                }
                return result;
            },
        }

        if (this.chain) {
            rebuild(this.chain, host);
        }

        // invalidate the data
        // queue rebuild the keys

        if (this.consumer0) {
            this.consumer0.cellsChanged(row, col, numRows, numCols, values, this);
            this.consumers.forEach(consumer => consumer.cellsChanged(row, col, numRows, numCols, values, this));
            // TODO: the recalc'd cells.
        }

        // grab the changed cells or notify as they are executed.
    }

    openMatrix(consumer: IMatrixConsumer<Value>): IMatrixReader<Value> {
        if (this.consumer0) {
            if (this.consumers.indexOf(consumer) === -1) {
                this.consumers.push(consumer);
            }
        }
        else {
            this.consumer0 = consumer;
        }
        return this.connect();
    }

    removeMatrixConsumer(consumer: IMatrixConsumer<Value>) {
        if (consumer === this.consumer0) {
            this.consumer0 = this.consumers.pop();
            return;
        }
        else if (this.consumer0) {
            const idx = this.consumers.indexOf(consumer);
            if (idx > -1) {
                this.consumers.splice(idx, 1);
            }
        }
    }

    invalidate(row: number, col: number) {
        this.cache.clear(row, col);
        this.invalidateKey(pointToKey(row, col));
    }

    createDirtier() {
        const { cache, binder } = this;
        function runDirtier(row: number, col: number) {
            const cell = cache.read(row, col);
            if (cell === undefined || !isFormulaCell(cell)) {
                const deps = binder.getDependents(row, col);
                if (deps) {
                    deps.forEach(runDirtier);
                }
                return;
            }
            if (cell.flag !== CalcFlag.Dirty) {
                cell.flag = CalcFlag.Dirty;
                const deps = binder.getDependents(row, col);
                if (deps) {
                    deps.forEach(runDirtier);
                }
            }
        }
        return runDirtier;
    }

    readCell(row: number, col: number) {
        assert(this.reader, "Reader should be opened on readCell");
        let cell = this.cache.read(row, col);
        if (cell === undefined) {
            cell = makeCell(this.reader!.read(row, col));
            if (cell !== undefined) {
                this.cache.write(row, col, cell);
            }
        }
        return cell;
    }

    read(row: number, col: number): Value {
        // TODO: this can be better!!!!
        const cell = this.readCell(row, col);
        if (cell && cell.flag === CalcFlag.Dirty) {
            try {
                const buildHost: BuildHost = {
                    readCell: this.readCell.bind(this),
                    binder: this.binder,
                    makeContext: this.inSheetContext,
                    rootObject: this.rootContext,
                }
                rebuild([pointToKey(row, col)], buildHost);
            } catch (e) {
                console.error(`Rebuild failure: ${e}`);
            }
        }
        if (cell) {
            if (isFormulaCell(cell)) {
                if (cell.value === undefined) {
                    return undefined;
                }
                let value: CellValue | CellFiber = cell.value;
                switch (typeof value) {
                    case "number":
                    case "string":
                    case "boolean":
                        return value;
                    case "function":
                        return "<function>";
                    case "object":
                        const context = this.inSheetContext([row, col]);
                        // TODO: Fix this to avoid loops
                        if (isRange(value)) {
                            value = context.read(value.tlRow, value.tlCol);
                            switch (typeof value) {
                                case "number":
                                case "string":
                                case "boolean":
                                    return value;
                                case "function":
                                    return "<function>";
                                case "object":
                                    if (isPending(value)) {
                                        return undefined;
                                    }
                            }
                        }
                        return value.serialise(context);
                    default:
                        return assertNever(value);
                }
            }
            return cell.content;
        }
        return undefined;
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
        const program = formula[0] === "=" ? formula.substring(1) : formula;
        //        const origin: Point = [0, 0];
        const fn = compile(program);
        if (fn === undefined) { return undefined; }
        const value = fn(this.outOfSheetContext, this.orphanFormulaContext)[1];
        return isDelayed(value) ? undefined : this.primitiveFromValue(this.outOfSheetContext, value);
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
                // TODO: Fix this to avoid loops
                if (isRange(value)) {
                    const result = context.read(value.tlRow, value.tlCol);
                    return isPending(result) ? undefined : this.primitiveFromValue(context, result);
                }
                const asString = value.serialise(context);
                return typeof asString === "string" ? asString : undefined;
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
                return isFormulaCell(cell) ? cell.value! : cell.content;

            case CalcFlag.Dirty:
            case CalcFlag.Enqueued:
                return makePendingCell(row, col);

            case CalcFlag.InCalc:
            default:
                return assertNever(cell as never);
        }
    }

    getCellValueAndLink(row: number, col: number, origin: Point) {
        const cell = this.readCell(row, col);
        if (cell === undefined) {
            this.binder.bindCells(pointToKey(row, col), pointToKey(origin[ROW], origin[COL]));
            return Sheetlet.blank;
        }
        switch (cell.flag) {
            case CalcFlag.Clean:
                this.binder.bindCells(pointToKey(row, col), pointToKey(origin[ROW], origin[COL]));
                return isFormulaCell(cell) ? cell.value! : cell.content;

            case CalcFlag.Dirty:
            case CalcFlag.Enqueued:
                return makePendingCell(row, col);

            case CalcFlag.InCalc:
                // TODO: proper cycle handling
                return errors.cycle;

            default:
                return assertNever(cell);
        }
    }
}

export const createSheetlet = (producer: IMatrixProducer<Value>, matrix: IMatrix<Cell>) => new Sheetlet(producer, matrix);
