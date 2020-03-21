/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CalcObj,
    CalcValue,
    compile,
    Delayed,
    isDelayed,
    Primitive,
    ReadableType,
    TypeName,
    IMatrixConsumer,
    IMatrixProducer,
    IMatrixReader,
} from "@tiny-calc/nano";

import {
    errors,
    isPending,
    isPendingFiber,
} from "./core";

import {
    createFormulaParser
} from "./formula";

import { funcs } from "./functions";

import {
    isRange,
    makeRange,
} from "./range";

import {
    CalcFlag,
    Cell,
    CellValue,
    Fiber,
    FormulaCell,
    FunctionFiber,
    IMatrix,
    PendingValue,
    Point,
    RangeContext,
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

function colNameToIndex(chars: string[]) {
    return chars
        .map((letter) => letter.toUpperCase().charCodeAt(0) - 64)
        .reduce((accumulator, value) => (accumulator * 26) + value, 0) - 1;
}

const isDigit = (ch: number) => ch >= 0x30 && ch <= 0x39;

function parseRef(maxRow: number, maxCol: number, text: string): Point | undefined {
    let i = 0;
    const colChars: string[] = [];
    while (i < text.length && !isDigit(text.charCodeAt(i))) {
        colChars.push(text[i]);
        i += 1;
    }
    const col = colNameToIndex(colChars);
    if (col > maxCol) { return undefined; }
    const rowText = text.substring(i);
    if (rowText === "") {
        return undefined;
    }
    const row = Number(text.substring(i)) - 1;
    if (row > maxRow) { return undefined; }
    return isNaN(row) ? undefined : [row, col];
}

/**
 * Depedency Graph
 *
 * Cell-key to cell-key graph. No rectangles (yet).
 * TODO: Tracking of externally linked formulas.
 */
interface Binder<F, T = F> {
    bindCells: (from: F, to: T) => void;
    getDeps: (source: F) => Set<T> | undefined;
    deleteLinks: (source: F) => void;
}

function initBinder(): Binder<number> {
    interface IGraph {
        cells: Map<number, Set<number>>;
        formulaConsumers?: Map<number, unknown>;
    }

    const graph: IGraph = { cells: new Map() };
    return {
        bindCells: (from, to) => {
            let links = graph.cells.get(from);
            if (links === undefined) {
                graph.cells.set(from, links = new Set());
            }
            links.add(to);
        },
        getDeps: (source) => graph.cells.get(source),
        deleteLinks: (source) => {
            graph.cells.delete(source);
        },
    };
}

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

function makeFormulaCell(text: string): FormulaCell {
    return { flag: CalcFlag.Dirty, content: text, value: undefined, fn: compile(text), prev: undefined, next: undefined };
}

function makeCell(value: Value) {
    if (value === undefined || value === "") {
        return undefined;
    }
    if (typeof value === "string" && value[0] === "=") {
        return makeFormulaCell(value.substring(1));
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

interface CellReader {
    readCell: (row: number, column: number) => Cell | undefined;
}

interface BuildHost extends CellReader {
    binder: Binder<number>;
    makeContext: (point: Point) => RangeContext;
    rootObject: CalcObj<RangeContext>;
}

function createInvalidator(reader: CellReader, binder: Binder<number>) {
    const go = (key: number) => {
        const point = keyToPoint(key);
        const cell = reader.readCell(point[ROW], point[COL]);
        if (cell === undefined || !isFormulaCell(cell)) {
            const deps = binder.getDeps(key);
            if (deps) {
                deps.forEach(go);
            }
            return;
        }
        if (cell.flag !== CalcFlag.Dirty) {
            cell.flag = CalcFlag.Dirty;
            const deps = binder.getDeps(key);
            if (deps) {
                deps.forEach(go);
            }
        }
    };
    return go;
}

/**
 * Initialize a build queue from edited `roots`.
 */
function initBuildQueue(chain: FormulaCell, roots: number[], reader: CellReader, binder: Binder<number>): FormulaCell | undefined {
    assert.strictEqual(chain.next, undefined);
    function queueKey(key: number) {
        const [row, column] = keyToPoint(key);
        const cell = reader.readCell(row, column);
        if (cell && isFormulaCell(cell) && cell.flag === CalcFlag.Dirty) {
            cell.flag = CalcFlag.Enqueued;
            // splice out the node and add it to the end of the chain.
            if (cell.prev) {
                cell.prev.next = cell.next;
            }
            if (cell.next) {
                cell.next.prev = cell.prev;
            }
            chain.next = cell;
            cell.prev = chain;
            cell.next = undefined;
            chain = cell;
            return;
        }
        const deps = binder.getDeps(key);
        binder.deleteLinks(key);
        if (deps) {
            deps.forEach(queueKey);
        }
        return;
    }
    roots.forEach(queueKey);
    return chain;
}

const coerceResult = (value: CellValue, context: RangeContext) => {
    if (typeof value === "object" && isRange(value)) {
        return context.read(value.tlRow, value.tlCol);
    }
    return value;
}

/**
 * Mark a cell as calculated with `value`, queue its dependents for
 * evaluation, and remove dependency links (to be re-established on
 * dependent recalc).
 */
function finishCell(queueKey: (key: number) => void, binder: Binder<number>, row: number, col: number, cell: FormulaCell, value: CellValue) {
    cell.value = value;
    const key = pointToKey(row, col);
    const deps = binder.getDeps(key);
    binder.deleteLinks(key);
    if (deps) {
        deps.forEach(queueKey);
    }
    cell.flag = CalcFlag.Clean;
}

const shouldQueueFiber = (host: BuildHost, row: number, column: number) => {
    const dependent = host.readCell(row, column);
    return dependent && (dependent.flag === CalcFlag.Dirty || dependent.flag === CalcFlag.Enqueued);
};

/**
 * Recalc `sheet`, starting from the edited `roots`.
 */
function rebuild(startChain: FormulaCell, roots: number[], host: BuildHost) {
    let chain: Fiber | undefined = initBuildQueue(startChain, roots, host, host.binder);

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

    function evalCell(row: number, col: number, cell: FormulaCell): true | PendingValue[] {
        if (cell.flag === CalcFlag.Clean) {
            return true;
        }
        if (cell.fn === undefined) {
            finishCell(queueKey, host.binder, row, col, cell, errors.compileFailure);
            return true;
        }
        cell.flag = CalcFlag.InCalc;
        const context = host.makeContext([row, col]);
        let result: [PendingValue[], Delayed<CellValue>] = [[], errors.evalFailure];
        try {
            result = cell.fn<RangeContext>(context, host.rootObject);
        } catch {
        }
        if (isDelayed(result[1])) {
            return result[0];
        }
        const value = coerceResult(result[1], context);
        if (isPending(value)) { return [value]; }
        finishCell(queueKey, host.binder, row, col, cell, value);
        return true;
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

function tryParseRange(context: RangeContext, text: string) {
    const normalizedText = text.toLowerCase();
    const asRange = normalizedText.split(":");
    if (asRange.length >= 1) {
        const first = context.parseRef(asRange[0]);
        if (first === undefined) {
            return undefined;
        }
        if (asRange[1] === undefined) {
            return makeRange(first[ROW], first[COL], first[ROW], first[COL]);
        }
        const second = context.parseRef(asRange[1]);
        if (second !== undefined) {
            return makeRange(first[ROW], first[COL], second[ROW], second[COL]);
        }
    }
    return undefined;
}



export class Sheetlet implements IMatrixConsumer<Value>, IMatrixProducer<Value>, IMatrixReader<Value> {
    private static readonly blank = "";

    public readonly binder = initBinder();
    public readonly parser = createFormulaParser();

    public readonly rootContext: CalcObj<RangeContext> & ReadableType<CellValue, RangeContext> = {
        typeMap() {
            return {
                [TypeName.Readable]: this
            }
        },
        serialise: () => "TODO",
        read: (_value: CalcObj<RangeContext>, message: string, context: RangeContext) => {
            if (message in funcs) {
                return funcs[message];
            }
            switch (message) {
                case "row":
                case "ROW":
                    return context.origin ? context.origin[ROW] + 1 : errors.unknownField;
                case "column":
                case "COLUMN":
                    return context.origin ? context.origin[COL] + 1 : errors.unknownField;
                default:
                    const range = tryParseRange(context, message);
                    return range || errors.unknownField;
            }
        },
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
        parseRef: this.parseRef.bind(this),
    });

    private readonly outOfSheetContext: RangeContext = {
        origin: undefined,
        read: this.getCellValueAndForget.bind(this),
        parseRef: this.parseRef.bind(this),
    };

    private readonly invalidateKey = createInvalidator({
        readCell: this.cache.read.bind(this.cache),
    }, this.binder);

    reader!: IMatrixReader<Value>;
    numRows: number = -1;
    numCols: number = -1;
    consumer0: IMatrixConsumer<Value> | undefined;
    consumers: IMatrixConsumer<Value>[] = [];

    constructor(readonly producer: IMatrixProducer<Value>, readonly cache: IMatrix<Cell>) { }

    connect() {
        this.reader = this.producer.openMatrix(this);
        this.numRows = this.reader.numRows;
        this.numCols = this.reader.numCols;
        return this;
    }

    rowsChanged(row: number, numRemoved: number, numInserted: number) {
        this.numRows = this.reader.numRows;
        if (this.consumer0) {
            this.consumer0.rowsChanged(row, numRemoved, numInserted, this);
            this.consumers.forEach(consumer => consumer.rowsChanged(row, numRemoved, numInserted, this))
        }
    }

    colsChanged(col: number, numRemoved: number, numInserted: number) {
        this.numCols = this.reader.numCols;
        if (this.consumer0) {
            this.consumer0.colsChanged(col, numRemoved, numInserted, this);
            this.consumers.forEach(consumer => consumer.colsChanged(col, numRemoved, numInserted, this))
        }
    }

    cellsChanged(row: number, col: number, numRows: number, numCols: number, values: readonly (Value)[] | undefined, producer: IMatrixProducer<Value>) {
        // invalidate the data
        // queue rebuild the keys
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
            this.consumer0 = undefined;
            this.consumer0 = this.consumers.pop();
        }
        else if (this.consumers) {
            const idx = this.consumers.indexOf(consumer);
            if (idx > -1) {
                this.consumers.splice(idx, 1);
            }
        }
    }

    public invalidate(row: number, col: number) {
        this.cache.clear(row, col);
        this.invalidateKey(pointToKey(row, col));
    }

    public parseRef(text: string): Point | undefined {
        return parseRef(this.numRows - 1, this.numCols - 1, text);
    }

    public readCell(row: number, col: number) {
        let cell = this.cache.read(row, col);
        if (cell === undefined) {
            cell = makeCell(this.reader.read(row, col));
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
    public evaluateFormula(formula: string): Value {
        const program = formula[0] === "=" ? formula.substring(1) : formula;
        //        const origin: Point = [0, 0];
        const fn = compile(program);
        if (fn === undefined) { return undefined; }
        const value = fn(this.outOfSheetContext, this.orphanFormulaContext)[1];
        return isDelayed(value) ? undefined : this.primitiveFromValue(this.outOfSheetContext, value);
    }

    private primitiveFromValue(context: RangeContext, value: CalcValue<RangeContext>): Value {
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

    private getCellValueAndForget(row: number, col: number) {
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

    private getCellValueAndLink(row: number, col: number, origin: Point) {
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
