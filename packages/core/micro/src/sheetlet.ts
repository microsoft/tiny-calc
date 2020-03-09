/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CalcFun,
    CalcObj,
    CalcValue,
    compile,
    Delayed,
    errors,
    Formula,
    isDelayed,
    makeError,
    Pending,
    ReadableType,
    Primitive,
    TypeMap,
    TypeName,
    Runtime,
    IMatrixConsumer,
    IMatrixProducer,
    IMatrixReader,
} from "@tiny-calc/nano";

import { IMatrix } from "./types";

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
type Point = [number, number];

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

/*
 * Cell Data Types
 */

/**
 * CalcFlags for Cell Status.
 */
const enum CalcFlag {
    Clean,
    Dirty,
    Enqueued,
    InCalc,
}

type Value = Primitive | undefined;
type CellValue = CalcValue<InSheetContext>;

interface ValueCell {
    flag: CalcFlag.Clean;
    content: Primitive;
}

interface FormulaCell {
    flag: CalcFlag;
    content: string;
    value: CellValue | undefined;
    fn: Formula | undefined;
}

type Cell = ValueCell | FormulaCell;

function valueCell(content: Primitive): ValueCell {
    return { flag: CalcFlag.Clean, content };
}

function formulaCell(content: string): FormulaCell {
    return { flag: CalcFlag.Clean, content, value: undefined, fn: undefined };
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

function makeFormulaCell(text: string) {
    // text should not start with '='
    const cell = formulaCell(text);
    cell.flag = CalcFlag.Dirty;
    cell.fn = compile(text);
    return cell;
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
    context: InSheetContext;
    rootObject: CalcObj<InSheetContext>;
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
function initBuildQueue(roots: number[], reader: CellReader, binder: Binder<number>) {
    const queue: Fiber[] = [];

    function queueKey(key: number) {
        const [row, column] = keyToPoint(key);
        const cell = reader.readCell(row, column);
        if (cell && isFormulaCell(cell) && cell.flag === CalcFlag.Dirty) {
            cell.flag = CalcFlag.Enqueued;
            queue.unshift(makePendingCell(row, column));
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
    return [queue, queueKey] as const;
}

interface PendingValue {
    kind: "Pending";
}

const enum FiberKind {
    Cell,
    Function,
}

interface CellFiber extends PendingValue {
    task: FiberKind.Cell;
    row: number;
    column: number;
}

type FunctionTask = "sum" | "product" | "count" | "average" | "max" | "min" | "concat";

interface FunctionFiber<O = unknown, T = unknown> extends PendingValue {
    task: FiberKind.Function;
    name: FunctionTask;
    range: Range<O>;
    origin: O;
    row: number;
    column: number;
    current: T;
}

type Fiber<O = unknown, T = unknown> = CellFiber | FunctionFiber<O, T>;

function makePendingCell(row: number, column: number): CellFiber {
    return { kind: "Pending", task: FiberKind.Cell, row, column };
}

function makePendingFunction<O, V>(name: FunctionTask, range: Range<O>, origin: O, row: number, column: number, current: V): FunctionFiber<O, V> {
    return { kind: "Pending", name, task: FiberKind.Function, range, origin, row, column, current };
}

function isPending(content: any): content is PendingValue {
    return typeof content === "object" && "kind" in content && content.kind === "Pending";
}

function isFiber(content: any): content is Fiber {
    return isPending(content) && "task" in content;
}

/**
 * Initialise a fiber stack for high-priority tasks.
 */
function initFiberStack() {
    const stack: Fiber[] = [];
    return [stack, (fiber: Fiber) => { stack.push(fiber); }] as const;
}

const coerceResult = (value: CellValue, context: InSheetContext) => {
    if (value instanceof Range) {
        return Range.dereference(value, context);
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
 * Basic errors.
 */
const errorValues = {
    ...errors,
    unknownField: makeError("#UNKNOWN!"),
    cycle: makeError("#CYCLE!"),
    fallbackCoercion: makeError("#VALUE!"),
    compileFailure: makeError("#COMPILE!"),
    evalFailure: makeError("#EVAL!"),
} as const;

/**
 * Recalc `sheet`, starting from the edited `roots`.
 */
function rebuild(roots: number[], host: BuildHost): void {
    const [queue, queueKey] = initBuildQueue(roots, host, host.binder);
    const [dynamicFibers, addFiber] = initFiberStack();

    function runCellFiber(fiber: CellFiber) {
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

    function runFunctionFiber<O, T>(fiber: FunctionFiber<O, T>) {
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
            finishCell(queueKey, host.binder, row, col, cell, errorValues.compileFailure);
            return true;
        }
        cell.flag = CalcFlag.InCalc;
        let result: [PendingValue[], Delayed<CellValue>] = [[], errorValues.evalFailure];
        try {
            result = cell.fn(host.context, host.rootObject);
        } catch {
        }
        if (isDelayed(result[1])) {
            return result[0];
        }
        const value = coerceResult(result[1], host.context);
        if (isPending(value)) { return [value]; }
        finishCell(queueKey, host.binder, row, col, cell, value);
        return true;
    }

    const lookupTable = {
        [FiberKind.Cell]: runCellFiber,
        [FiberKind.Function]: runFunctionFiber,
    } as const;

    while (queue.length !== 0 || dynamicFibers.length !== 0) {
        const fiber = dynamicFibers.pop() || queue.pop()!;
        lookupTable[fiber.task](fiber as any);
    }
}

/*
 * Function implementations.
 * These are mostly reducer wrappers around Range aggregations.
 */

type PrimitiveMap = {
    number: number;
    string: string;
    boolean: boolean;
}

function extractTypeFromProperty<K extends keyof PrimitiveMap>(
    type: K, defaultValue: PrimitiveMap[K]
): <O, Delay>(runtime: Runtime<Delay>, origin: O, arg: CalcValue<O>, property: string) => PrimitiveMap[K] | Delay | CalcValue<O>;


function extractTypeFromProperty(
    type: keyof PrimitiveMap,
    defaultValue: Primitive
): <O, Delay>(runtime: Runtime<Delay>, origin: O, arg: CalcValue<O>, property: string) => Primitive | Delay | CalcValue<O> {
    return <O, Delay>(runtime: Runtime<Delay>, origin: O, arg: CalcValue<O>, property: string) => {
        if (typeof arg === type) { return arg; } // fast path
        switch (typeof arg) {
            case "object":
            case type:
                return runtime.read(origin, arg, property, arg);
            default:
                return defaultValue;
        }
    }
}

const extractNumberFromProperty = extractTypeFromProperty("number", 0);
const extractStringFromProperty = extractTypeFromProperty("string", "");

function reduceType<K extends keyof PrimitiveMap>(type: K): <O, Delay>(args: (Delay | CalcValue<O>)[], fn: (prev: PrimitiveMap[K], current: PrimitiveMap[K]) => PrimitiveMap[K], init: PrimitiveMap[K]) => PrimitiveMap[K] | CalcValue<O> | Delay;
function reduceType<K extends keyof PrimitiveMap>(type: K): <O, Delay>(args: (Delay | CalcValue<O>)[], fn: (prev: Primitive, current: Primitive) => Primitive, init: Primitive) => Primitive | CalcValue<O> | Delay {
    return <O, Delay>(args: (CalcValue<O> | Delay)[], fn: (prev: Primitive, current: Primitive) => Primitive, init: Primitive) => {
        let total = init;
        for (const arg of args) {
            if (typeof arg !== type) {
                return arg;
            }
            total = fn(total, arg as Primitive);
        }
        return total;
    }
}

const reduceNumbers = reduceType("number");
const reduceStrings = reduceType("string");


const sum: CalcFun<unknown> = (runtime, origin, args) => {
    const totals = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "sum"));
    return reduceNumbers(totals, (prev, current) => prev + current, 0);
};

const product: CalcFun<unknown> = (runtime, origin, args) => {
    const totals = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "product"));
    return reduceNumbers(totals, (prev, current) => prev * current, 1);
};

const count: CalcFun<unknown> = (runtime, origin, args) => {
    const totals = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "count"));
    return reduceNumbers(totals, (prev, current) => prev + current, 0);
};

const average: CalcFun<unknown> = (runtime, origin, args) => {
    const totals = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "sum"));
    const counts = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "count"));
    const total = reduceNumbers(totals, (prev, current) => prev + current, 0);
    if (typeof total === "number") {
        const count = reduceNumbers(counts, (prev, current) => prev + current, 0);
        return typeof count === "number" ? count === 0 ? errorValues.div0 : total / count : count;
    }
    return total;
};

const max: CalcFun<unknown> = (runtime, origin, args) => {
    if (args.length === 0) { return 0; }
    const maxs = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "max"));
    for (const arg of maxs) {
        if (typeof arg !== "number") {
            return arg;
        }
    }
    return reduceNumbers(maxs, (prev, current) => current > prev ? current : prev, maxs[0] as number);
};

const min: CalcFun<unknown> = (runtime, origin, args) => {
    if (args.length === 0) { return 0; }
    const mins = args.map((arg) => extractNumberFromProperty(runtime, origin, arg, "min"));
    for (const arg of mins) {
        if (typeof arg !== "number") {
            return arg;
        }
    }
    return reduceNumbers(mins, (prev, current) => current < prev ? current : prev, mins[0] as number);
};


const concat: CalcFun<unknown> = (runtime, origin, args) => {
    const val = args.map((arg) => extractStringFromProperty(runtime, origin, arg, "concat"));
    return reduceStrings(val, (prev, current) => prev + current, "");
};

const funcs: Record<string, CalcFun<unknown>> = {
    sum, product, count, average, max, min, concat,
    SUM: sum, PRODUCT: product, COUNT: count, AVERAGE: average, MAX: max, MIN: min, CONCAT: concat,
};

/*
 * Function Runners are accumulators over ranges.
 */

type FunctionRunner<Res> = [Res, (x: unknown) => void];

const createRunner = <Res>(fn: (box: [Res]) => (x: unknown) => void) => {
    return (init: Res) => {
        const result: FunctionRunner<Res> = [init, undefined!];
        result[1] = fn(result as unknown as [Res]);
        return result;
    };
};

const createSum = createRunner<number>(result => n => { if (typeof n === "number") { result[0] += n; } });
const createProduct = createRunner<number>(result => n => { if (typeof n === "number") { result[0] *= n; } });
const createCount = createRunner<number>(result => n => { if (typeof n === "number") { result[0]++; } });
const createAverage = createRunner<[number, number]>(result => n => { if (typeof n === "number") { result[0][0] += n; result[0][1]++; } });
const createMax = createRunner<number | undefined>(
    result => n => {
        if (typeof n === "number" && (result[0] === undefined || n > result[0])) {
            result[0] = n;
        }
    },
);
const createMin = createRunner<number | undefined>(
    result => n => {
        if (typeof n === "number" && (result[0] === undefined || n < result[0])) {
            result[0] = n;
        }
    },
);
const createConcat = createRunner<string>((result) => s => { if (typeof s === "string") { result[0] += s; } });

/*
 * Core aggregation functions over ranges
 */

interface RangeContext<O> {
    origin: O;
    link: (row: number, col: number, origin: O) => CalcValue<RangeContext<O>> | CellFiber;
    parseRef: (text: string) => Point | undefined;
}

type RangeAggregation<R, Accum = R> = <O>(
    range: Range<O>, context: RangeContext<O>, someTask?: FunctionFiber<O, Accum>,
) => R | FunctionFiber<O, Accum>;

function runFunc<O, Res>(context: RangeContext<O>, task: FunctionFiber<O, Res>, initRunner: (init: Res) => FunctionRunner<Res>) {
    const { current, row, column, range } = task;
    const runner = initRunner(current);
    const run = runner[1];
    const endR = row + range.height;
    const endC = column + range.width;
    // TODO: This is not resumable! See function fiber for how to do
    // this properly.
    for (let i = row; i < endR; i += 1) {
        for (let j = column; j < endC; j += 1) {
            const content = context.link(i, j, task.origin);
            if (isPending(content)) {
                assert.strictEqual(content.task, FiberKind.Cell);
                task.row = i;
                task.column = j;
                task.current = runner[0];
                return task;
            }
            run(content);
        }
    }
    return runner[0];
}

const rangeSum: RangeAggregation<number> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("sum", range, context.origin, range.tlRow, range.tlCol, 0);
    return runFunc(context, task, createSum);
};

const rangeProduct: RangeAggregation<number> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("product", range, context.origin, range.tlRow, range.tlCol, 1);
    return runFunc(context, task, createProduct);
};

const rangeCount: RangeAggregation<number> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("count", range, context.origin, range.tlRow, range.tlCol, 0);
    return runFunc(context, task, createCount);
};

const rangeAverage: RangeAggregation<number | CalcObj<unknown>, [number, number]> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("average", range, context.origin, range.tlRow, range.tlCol, [0, 0]);
    const result = runFunc(context, task, createAverage);
    if (isPending(result)) { return result; }
    const [total, finalCount] = result;
    return finalCount === 0 ? errorValues.div0 : total / finalCount;
};

const rangeMax: RangeAggregation<number, number | undefined> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("max", range, context.origin, range.tlRow, range.tlCol, undefined);
    const result = runFunc(context, task, createMax);
    return result === undefined ? 0 : result;
};

const rangeMin: RangeAggregation<number, number | undefined> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("min", range, context.origin, range.tlRow, range.tlCol, undefined);
    const result = runFunc(context, task, createMin);
    return result === undefined ? 0 : result;
};

const rangeConcat: RangeAggregation<string> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("concat", range, context.origin, range.tlRow, range.tlCol, "");
    return runFunc(context, task, createConcat);
};

type FreshAggregation<R, Accum = R> = <O>(range: Range<O>, context: RangeContext<O>) => R | FunctionFiber<O, Accum>;

const aggregations: Record<string, FreshAggregation<CalcValue<unknown>, unknown>> = {
    sum: rangeSum, product: rangeProduct, count: rangeCount, average: rangeAverage, max: rangeMax, min: rangeMin, concat: rangeConcat,
    SUM: rangeSum, PRODUCT: rangeProduct, COUNT: rangeCount, AVERAGE: rangeAverage, MAX: rangeMax, MIN: rangeMin, CONCAT: rangeConcat,
};

function tryParseRange<O>(context: RangeContext<O>, text: string) {
    const normalizedText = text.toLowerCase();
    const asRange = normalizedText.split(":");
    if (asRange.length >= 1) {
        const first = context.parseRef(asRange[0]);
        if (first === undefined) {
            return undefined;
        }
        if (asRange[1] === undefined) {
            return new Range<O>(first, first);
        }
        const second = context.parseRef(asRange[1]);
        if (second !== undefined) {
            return new Range<O>(first, second);
        }
    }
    return undefined;
}

/**
 * A Range represents a view of the grid that knows how to calculate
 * aggregations over the view. The canonical value of a Range is the
 * top left corner.
 */
class Range<O> implements CalcObj<RangeContext<O>> {
    public readonly tlRow: number;
    public readonly tlCol: number;
    public readonly height: number;
    public readonly width: number;

    constructor(first: Point, second: Point) {
        this.tlRow = first[ROW] < second[ROW] ? first[ROW] : second[ROW];
        this.tlCol = first[COL] < second[COL] ? first[COL] : second[COL];
        this.height = Math.abs(first[ROW] - second[ROW]) + 1;
        this.width = Math.abs(first[COL] - second[COL]) + 1;
    }

    public transportRange<O2>(): Range<O2> {
        return this as any as Range<O2>;
    }

    public typeMap(): TypeMap<this, RangeContext<O>> {
        return {
            [TypeName.Readable]: Range,
            [TypeName.Reference]: Range
        }
    }

    public serialise() {
        return "REF";
    }

    public static dereference<O>(value: Range<O>, context: RangeContext<O>) {
        return context.link(value.tlRow, value.tlCol, context.origin);
    }

    public static read<O>(receiver: Range<O>, message: string, context: RangeContext<O>): CalcValue<RangeContext<O>> | Pending<CalcValue<RangeContext<O>>> {
        if (aggregations[message] !== undefined) {
            const fn = aggregations[message as keyof typeof aggregations];
            return fn(receiver, context);
        }
        switch (message) {
            case "row":
            case "ROW":
                return receiver.tlRow + 1;
            case "column":
            case "COLUMN":
                return receiver.tlCol + 1;
            default:
                const value = context.link(receiver.tlRow, receiver.tlCol, context.origin);
                if (typeof value === "object") {
                    if (isPending(value)) {
                        return value;
                    }
                    const reader = value.typeMap()[TypeName.Readable];
                    if (reader) {
                        return reader.read(value, message, context);
                    }
                }
                return errorValues.unknownField;

        }
    }
}

type InSheetContext = RangeContext<Point>;
type OutSheetContext = RangeContext<unknown>;

class Sheetlet implements IMatrixConsumer<Value>, IMatrixProducer<Value>, IMatrixReader<Value> {
    private static readonly blank = "";

    public readonly binder = initBinder();

    public readonly rootContext: CalcObj<InSheetContext> & ReadableType<CellValue, InSheetContext> = {
        typeMap() {
            return {
                [TypeName.Readable]: this
            }
        },
        serialise: () => "TODO",
        read: (_value: CalcObj<InSheetContext>, message: string, context: InSheetContext) => {
            if (message in funcs) {
                return funcs[message];
            }
            switch (message) {
                case "row":
                case "ROW":
                    return context.origin[ROW] + 1;
                case "column":
                case "COLUMN":
                    return context.origin[COL] + 1;
                default:
                    const range = tryParseRange(context, message);
                    return range || errorValues.unknownField;
            }
        },
    };

    private readonly orphanFormulaContext: CalcObj<RangeContext<unknown>> & ReadableType<CalcObj<RangeContext<unknown>>, RangeContext<unknown>> = {
        typeMap() {
            return {
                [TypeName.Readable]: this
            }
        },
        serialise: () => "TODO",
        read: (_: CalcObj<RangeContext<unknown>>, message: string) => {
            if (message in funcs) {
                return funcs[message];
            }
            const range = tryParseRange(this.outOfSheetContext, message);
            return range || errorValues.unknownField;
        },
    };

    private readonly inSheetContext: (origin: Point) => InSheetContext = origin => ({
        origin,
        link: this.getCellValueAndLink.bind(this),
        parseRef: this.parseRef.bind(this),
    });

    private readonly outOfSheetContext: OutSheetContext = {
        origin: undefined,
        link: this.getCellValueAndForget.bind(this),
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
        this.connect();
        return this;
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
                    context: this.inSheetContext([row, col]),
                    rootObject: this.rootContext,
                }
                rebuild([pointToKey(row, col)], buildHost);
            } catch (e) {
                console.error(`Rebuild failure: ${e}`);
            }
        }
        if (cell) {
            return isFormulaCell(cell) ?
                cell.value === undefined ?
                    undefined :
                    this.primitiveFromValue(this.inSheetContext([row, col]), cell.value)
                :
                cell.content;
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

    private primitiveFromValue<O>(context: RangeContext<O>, value: CalcValue<RangeContext<O>>): Value {
        switch (typeof value) {
            case "number":
            case "string":
            case "boolean":
                return value;
            case "function":
                return "<function>";
            case "object":
                if (value instanceof Range) {
                    return this.primitiveFromValue(context, Range.dereference(value, context) as CalcValue<RangeContext<O>>);
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
                if (isFormulaCell(cell)) {
                    const value = cell.value!
                    if (value && value instanceof Range) {
                        return value.transportRange<unknown>();
                    }
                }
                return cell.content;

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
                return errorValues.cycle;

            default:
                return assertNever(cell);
        }
    }
}

export const createSheetlet = (producer: IMatrixProducer<Value>, matrix: IMatrix<Cell>) => new Sheetlet(producer, matrix);
