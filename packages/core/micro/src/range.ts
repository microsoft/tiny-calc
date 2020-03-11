/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CalcObj,
    CalcValue,
    Pending,
    TypeMap,
    TypeName,
} from "@tiny-calc/nano";

import {
    errors,
    isPending,
    makePendingFunction,
} from "./core";


import {
    FunctionFiber,
    Range,
    RangeContext,
} from "./types";

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

type RangeAggregation<R, Accum = R> = (range: Range, context: RangeContext, someTask?: FunctionFiber<Accum>) => R | FunctionFiber<Accum>;

function runFunc<Res>(context: RangeContext, task: FunctionFiber<Res>, initRunner: (init: Res) => FunctionRunner<Res>) {
    const { current, row, column, range } = task;
    const runner = initRunner(current);
    const run = runner[1];
    const endR = row + range.height;
    const endC = column + range.width;
    // TODO: This is not resumable! See function fiber for how to do
    // this properly.
    for (let i = row; i < endR; i += 1) {
        for (let j = column; j < endC; j += 1) {
            const content = context.link(i, j);
            if (isPending(content)) {
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
    const task = someTask || makePendingFunction("sum", range, range.tlRow, range.tlCol, 0);
    return runFunc(context, task, createSum);
};

const rangeProduct: RangeAggregation<number> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("product", range, range.tlRow, range.tlCol, 1);
    return runFunc(context, task, createProduct);
};

const rangeCount: RangeAggregation<number> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("count", range, range.tlRow, range.tlCol, 0);
    return runFunc(context, task, createCount);
};

const rangeAverage: RangeAggregation<number | CalcObj<unknown>, [number, number]> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("average", range, range.tlRow, range.tlCol, [0, 0]);
    const result = runFunc(context, task, createAverage);
    if (isPending(result)) { return result; }
    const [total, finalCount] = result;
    return finalCount === 0 ? errors.div0 : total / finalCount;
};

const rangeMax: RangeAggregation<number, number | undefined> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("max", range, range.tlRow, range.tlCol, undefined);
    const result = runFunc(context, task, createMax);
    return result === undefined ? 0 : result;
};

const rangeMin: RangeAggregation<number, number | undefined> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("min", range, range.tlRow, range.tlCol, undefined);
    const result = runFunc(context, task, createMin);
    return result === undefined ? 0 : result;
};

const rangeConcat: RangeAggregation<string> = (range, context, someTask?) => {
    const task = someTask || makePendingFunction("concat", range, range.tlRow, range.tlCol, "");
    return runFunc(context, task, createConcat);
};

type FreshAggregation<R, Accum = R> = (range: Range, context: RangeContext) => R | FunctionFiber<Accum>;

const aggregations: Record<string, FreshAggregation<CalcValue<unknown>, unknown>> = {
    sum: rangeSum, product: rangeProduct, count: rangeCount, average: rangeAverage, max: rangeMax, min: rangeMin, concat: rangeConcat,
    SUM: rangeSum, PRODUCT: rangeProduct, COUNT: rangeCount, AVERAGE: rangeAverage, MAX: rangeMax, MIN: rangeMin, CONCAT: rangeConcat,
};

const serialiseRange = () => "REF";

const rangeTypeMap: TypeMap<Range, RangeContext> = {
    [TypeName.Readable]: {
        read: (receiver: Range, message: string, context: RangeContext): CalcValue<RangeContext> | Pending<CalcValue<RangeContext>> => {
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
                    const value = context.link(receiver.tlRow, receiver.tlCol);
                    if (typeof value === "object") {
                        if (isPending(value)) {
                            return value;
                        }
                        const reader = value.typeMap()[TypeName.Readable];
                        if (reader) {
                            return reader.read(value, message, context);
                        }
                    }
                    return errors.unknownField;

            }
        }
    },
    [TypeName.Reference]: {
        dereference: (value: Range, context: RangeContext) => context.link(value.tlRow, value.tlCol)
    }
}

const getRangeType = () => rangeTypeMap;

export const isRange = (v: { typeMap: () => unknown; }): v is Range => {
    return v.typeMap() === rangeTypeMap;
}

/**
 * A Range represents a view of the grid that knows how to calculate
 * aggregations over the view. The canonical value of a Range is the
 * top left corner.
 */
export function makeRange(firstR: number, firstC: number, secondR: number, secondC: number): Range {
    return {
        tlRow: firstR < secondR ? firstR : secondR,
        tlCol: firstC < secondC ? firstC : secondC,
        height: Math.abs(firstR - secondR) + 1,
        width: Math.abs(firstC - secondC) + 1,
        serialise: serialiseRange,
        typeMap: getRangeType,
    }
}
