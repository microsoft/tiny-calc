/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CalcFun,
    CalcValue,
    errors,
    Primitive,
    Runtime,
} from "@tiny-calc/nano";

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
        return typeof count === "number" ? count === 0 ? errors.div0 : total / count : count;
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

export const funcs: Record<string, CalcFun<unknown>> = {
    sum, product, count, average, max, min, concat,
    SUM: sum, PRODUCT: product, COUNT: count, AVERAGE: average, MAX: max, MIN: min, CONCAT: concat,
};
