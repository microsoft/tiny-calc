import { Pending } from "./types";
import { SyntaxKind } from "./parser";

export type Primitive = number | string | boolean;

// TODO: Support Completions
export interface CalcObj<O> {
    request(origin: O, property: string, ...args: any[]): CalcValue<O> | Pending<CalcValue<O>>;
}

export interface CalcFun {
    <O>(trace: Trace, origin: O, args: CalcValue<O>[]): Delayed<CalcValue<O>>;
}

export type CalcValue<O> = Primitive | CalcObj<O> | CalcFun;

export function makeError(message: string): CalcObj<unknown> {
    return {
        request(_, property) {
            if (property === "stringify") { return message };
            return this;
        }
    };
}

const requestOnNonObjectError = makeError("The target of a dot-operation must be a calc object.");
const appOnNonFunctionError = makeError("The target of an application must be a calc function.");
const functionAsOpArgumentError = makeError("Operator argument must be a primitive.");
const functionArityError = makeError("#ARITY!");
const div0 = makeError("#DIV/0!");

export const errors = {
    requestOnNonObjectError,
    appOnNonFunctionError,
    functionAsOpArgumentError,
    functionArityError,
    div0,
} as const;

/**
 * Delay Effects
 */

declare const $effect: unique symbol;
export type Delay = { [$effect]: never };
export type Delayed<T> = T | Delay;

const delay: Delay = {} as any;

export function isDelayed<T>(x: Delayed<T>): x is Delay {
    return x === delay;
}

/** 
 * A `Trace` function lifts possibly pending values into `Delayed` and
 * records any pending value.
 */
export type Trace = <T>(value: T | Pending<T>) => Delayed<T>;

export function makeTracer(): [Pending<unknown>[], Trace] {
    // The trace function is used to catch pending values early and
    // replace them with a sentinel so that we can use pointer
    // equality throughout the rest of a calculation. The
    // side-effecting here, as opposed to in app/app2, is justified by
    // pretending that all requests are written in ANF.
    const data: Pending<unknown>[] = [];
    const fn: Trace = <T>(value: T | Pending<T>) => {
        if (typeof value === "object" && (value as any).kind === "Pending") {
            return data.push(value as Pending<unknown>), delay;
        }
        return value as T;
    }
    return [data, fn];
}

/** Lifting of core operations into the `Delayed` S.A.F. */
export interface LiftedCore {
    req: <O>(trace: Trace, host: O, context: Delayed<CalcValue<O>>, prop: string) => Delayed<CalcValue<O>>;
    select: <L, R>(cond: Delayed<boolean>, l: () => Delayed<L>, r: () => Delayed<R>) => Delayed<L | R>;
    app1: <O, A, B>(trace: Trace, host: O, op: <O>(trace: Trace, host: O, expr: A) => B, expr: Delayed<A>) => Delayed<B>;
    app2: <O, A, B, C>(trace: Trace, host: O, op: <O>(trace: Trace, host: O, l: A, r: B) => C, l: Delayed<A>, r: Delayed<B>) => Delayed<C>;
    appN: <O>(trace: Trace, host: O, fn: Delayed<CalcValue<O>>, args: Delayed<CalcValue<O>>[]) => Delayed<CalcValue<O>>;
}

function req<O>(trace: Trace, host: O, context: Delayed<CalcValue<O>>, prop: string): Delayed<CalcValue<O>> {
    return isDelayed(context) ? delay : typeof context === "object" ? trace(context.request(host, prop)) : requestOnNonObjectError;
}

function select<L, R>(cond: Delayed<boolean>, l: () => Delayed<L>, r: () => Delayed<R>): Delayed<L | R> {
    return isDelayed(cond) ? cond : cond ? l() : r();
}

function app1<O, A, B>(trace: Trace, host: O, op: <O>(trace: Trace, host: O, expr: A) => B, expr: Delayed<A>): Delayed<B> {
    return isDelayed(expr) ? delay : op(trace, host, expr);
}

function app2<O, A, B, C>(trace: Trace, host: O, op: <O>(trace: Trace, host: O, l: A, r: B) => C, l: Delayed<A>, r: Delayed<B>): Delayed<C> {
    return isDelayed(l) || isDelayed(r) ? delay : op(trace, host, l, r);
}

function appN<O>(trace: Trace, host: O, fn: Delayed<CalcValue<O>>, args: Delayed<CalcValue<O>>[]): Delayed<CalcValue<O>> {
    if (isDelayed(fn)) { return delay };
    let target: Delayed<CalcValue<O>> = fn;
    if (typeof target === "object") {
        target = trace(target.request(host, "value"));
    }
    if (isDelayed(target)) { return delay; }
    if (typeof target !== "function") { return appOnNonFunctionError; }
    for (let i = 0; i < args.length; i += 1) {
        if (isDelayed(args[i])) { return delay };
    }
    return target(trace, host, args as CalcValue<O>[]);
}

export const ef: LiftedCore = { req, select, app1, app2, appN };

export const binaryOperationsMap = {
    [SyntaxKind.PlusToken]: "plus",
    [SyntaxKind.MinusToken]: "minus",
    [SyntaxKind.AsteriskToken]: "mult",
    [SyntaxKind.SlashToken]: "div",
    [SyntaxKind.EqualsToken]: "eq",
    [SyntaxKind.LessThanToken]: "lt",
    [SyntaxKind.GreaterThanToken]: "gt",
    [SyntaxKind.LessThanEqualsToken]: "lte",
    [SyntaxKind.GreaterThanEqualsToken]: "gte",
    [SyntaxKind.NotEqualsToken]: "ne",
} as const;

export const unaryOperationsMap = {
    [SyntaxKind.MinusToken]: "negate",
} as const;

type BinaryOperations = typeof binaryOperationsMap;
type UnaryOperations = typeof unaryOperationsMap;
type Operations = BinaryOperations[keyof BinaryOperations] | UnaryOperations[keyof UnaryOperations];
type TinyCalcBinOp = <O>(trace: Trace, host: O, l: CalcValue<O>, r: CalcValue<O>) => Delayed<CalcValue<O>>;
type TinyCalcUnaryOp = <O>(trace: Trace, host: O, expr: CalcValue<O>) => Delayed<CalcValue<O>>;

function liftBinOp(fn: (l: Primitive, r: Primitive) => CalcValue<unknown>): TinyCalcBinOp {
    return (trace, host, l, r) => {
        const lAsValue = typeof l === "object" ? trace(l.request(host, "value")) : l;
        const rAsValue = typeof r === "object" ? trace(r.request(host, "value")) : r;
        if (typeof lAsValue === "object") { return lAsValue; }
        if (isDelayed(rAsValue)) { return delay; }
        if (typeof lAsValue === "function") { return functionAsOpArgumentError; }
        if (typeof rAsValue === "function") { return functionAsOpArgumentError; }
        if (typeof rAsValue === "object") { return rAsValue; }
        return fn(lAsValue, rAsValue);
    };
}

function liftUnaryOp(fn: (expr: Primitive) => Primitive): TinyCalcUnaryOp {
    return (trace, host, expr) => {
        const exprAsValue = typeof expr === "object" ? trace(expr.request(host, "value")) : expr;
        if (typeof exprAsValue === "object") { return exprAsValue; }
        if (typeof exprAsValue === "function") { return functionAsOpArgumentError; }
        return fn(exprAsValue);
    };
}

export type OpContext = Record<Operations, TinyCalcBinOp | TinyCalcUnaryOp>;

export const ops: OpContext = {
    plus: liftBinOp((x: any, y: any) => x + y),
    minus: liftBinOp((x: any, y: any) => x - y),
    mult: liftBinOp((x: any, y: any) => x * y),
    div: liftBinOp((x: any, y: any) => y === 0 ? errors.div0 : x / y),
    eq: liftBinOp((x: any, y: any) => x === y),
    lt: liftBinOp((x: any, y: any) => x < y),
    gt: liftBinOp((x: any, y: any) => x > y),
    lte: liftBinOp((x: any, y: any) => x <= y),
    gte: liftBinOp((x: any, y: any) => x >= y),
    ne: liftBinOp((x: any, y: any) => x !== y),
    negate: liftUnaryOp((x: any) => -x),
};

export type Formula = <O>(host: O, context: CalcValue<O>) => [Pending<unknown>[], Delayed<CalcValue<O>>];

