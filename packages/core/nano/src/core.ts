import { Pending, Primitive } from "./types";
import { SyntaxKind } from "./parser";

// TODO: Support Completions
export interface CalcObj<O> {
    read: (property: string, origin: O, ...args: any[]) => CalcValue<O> | Pending<CalcValue<O>>;
}

export interface CalcFun<ODef> {
    <OCall extends ODef>(runtime: Runtime, origin: OCall, args: CalcValue<OCall>[]): Delayed<CalcValue<OCall>>;
}

export type CalcValue<O> = Primitive | CalcObj<O> | CalcFun<O>;

export const enum ObjProps {
    AsString = "stringify",
    AsPrimitive = "value",
}

export function makeError(message: string): CalcObj<unknown> {
    return {
        read(property) {
            if (property === ObjProps.AsString) { return message };
            return this;
        }
    };
}

const readOnNonObjectError = makeError("The target of a dot-operation must be a calc object.");
const appOnNonFunctionError = makeError("The target of an application must be a calc function.");
const functionAsOpArgumentError = makeError("Operator argument must be a primitive.");
const functionArityError = makeError("#ARITY!");
const div0 = makeError("#DIV/0!");

export const errors = {
    readOnNonObjectError,
    appOnNonFunctionError,
    functionAsOpArgumentError,
    functionArityError,
    div0,
} as const;

declare const $effect: unique symbol;
export type Delay = { [$effect]: never };
const delay: Delay = {} as any;

/**
 * A expression of type `Delayed<T>` represents a computation that
 * either delivers a value of type `T`, or is blocked on multiple
 * requests. A tracer is used to lift a single blocked request
 * (`Pending<T>`) into the `Delayed` effect.
 */
export type Delayed<T> = T | Delay;

export function isDelayed<T>(x: Delayed<T>): x is Delay {
    return x === delay;
}

/** 
 * A `Trace` function lifts possibly pending values into `Delayed` and
 * records any pending value. This allows us to gather multiple
 * pending values in a single computation
 */
type Trace = <T>(value: T | Pending<T>) => Delayed<T>;

function makeTracer(): [Pending<unknown>[], Trace] {
    // The trace function is used to catch pending values early and
    // replace them with a sentinel so that we can use pointer
    // equality throughout the rest of a calculation. The
    // side-effecting here, as opposed to in app/app2, is justified by
    // pretending that all reads are written in ANF.
    const data: Pending<unknown>[] = [];
    const fn: Trace = <T>(value: T | Pending<T>) => {
        if (typeof value === "object" && value && (value as any).kind === "Pending") {
            return data.push(value as Pending<unknown>), delay;
        }
        return value as T;
    }
    return [data, fn];
}

/**
 * Core expression runtime that implements collection and propagation
 * of potentially unavailable resources.
 *
 * This is like a selective applicative functor + fetch, if you squint
 * hard enough. `app1` and `app2` are specialised to the cases where
 * the function is always produced via `pure`.
 */
export interface Runtime {
    read: <O, F>(origin: O, context: Delayed<CalcValue<O>>, prop: string, fallback: F) => Delayed<CalcValue<O> | F>;
    ifS: <A>(cond: Delayed<boolean>, cont: (cond: boolean) => Delayed<A>) => Delayed<A>;
    app1: <O, A, B>(origin: O, op: (runtime: Runtime, origin: O, expr: A) => B, expr: Delayed<A>) => Delayed<B>;
    app2: <O, A, B, C>(origin: O, op: (runtime: Runtime, origin: O, l: A, r: B) => C, l: Delayed<A>, r: Delayed<B>) => Delayed<C>;
    appN: <O, F>(origin: O, fn: Delayed<CalcValue<O>>, args: Delayed<CalcValue<O>>[], fallback: F) => Delayed<CalcValue<O> | F>;
}

class CoreRuntime {
    constructor(public trace: Trace) { }

    read<O, F>(origin: O, context: Delayed<CalcValue<O>>, prop: string, fallback: F): Delayed<CalcValue<O> | F> {
        if (isDelayed(context)) { return delay }
        return typeof context === "object" ? this.trace(context.read(prop, origin)) : fallback;
    }

    ifS<A>(cond: Delayed<boolean>, cont: (cond: boolean) => Delayed<A>): Delayed<A> {
        return isDelayed(cond) ? cond : cont(cond);
    }

    app1<O, A, B>(origin: O, op: (runtime: Runtime, origin: O, expr: A) => B, expr: Delayed<A>): Delayed<B> {
        return isDelayed(expr) ? delay : op(this, origin, expr);
    }

    app2<O, A, B, C>(origin: O, op: (runtime: Runtime, origin: O, l: A, r: B) => C, l: Delayed<A>, r: Delayed<B>): Delayed<C> {
        return isDelayed(l) || isDelayed(r) ? delay : op(this, origin, l, r);
    }

    appN<O, F>(origin: O, fn: Delayed<CalcValue<O>>, args: Delayed<CalcValue<O>>[], fallback: F): Delayed<CalcValue<O> | F> {
        if (isDelayed(fn)) { return delay };
        let target: Delayed<CalcValue<O>> = fn;
        if (typeof target === "object") {
            target = this.trace(target.read(ObjProps.AsPrimitive, origin));
        }
        if (isDelayed(target)) { return delay; }
        if (typeof target !== "function") { return fallback; }
        for (let i = 0; i < args.length; i += 1) {
            if (isDelayed(args[i])) { return delay };
        }
        return target(this, origin, args as CalcValue<O>[]);
    }
}

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

type CoreBinOp = <O>(runtime: Runtime, origin: O, l: CalcValue<O>, r: CalcValue<O>) => Delayed<CalcValue<O>>;
type CoreUnaryOp = <O>(runtime: Runtime, origin: O, expr: CalcValue<O>) => Delayed<CalcValue<O>>;

function liftBinOp(fn: (l: Primitive, r: Primitive) => CalcValue<unknown>): CoreBinOp {
    return (runtime, origin, l, r) => {
        const lAsValue = runtime.read(origin, l, ObjProps.AsPrimitive, l);
        const rAsValue = runtime.read(origin, r, ObjProps.AsPrimitive, r);
        if (isDelayed(lAsValue) || isDelayed(rAsValue)) { return delay; }
        if (typeof lAsValue === "object") { return lAsValue; }
        if (typeof lAsValue === "function") { return functionAsOpArgumentError; }
        if (typeof rAsValue === "function") { return functionAsOpArgumentError; }
        if (typeof rAsValue === "object") { return rAsValue; }
        return fn(lAsValue, rAsValue);
    };
}

function liftUnaryOp(fn: (expr: Primitive) => Primitive): CoreUnaryOp {
    return (runtime, origin, expr) => {
        const exprAsValue = runtime.read(origin, expr, ObjProps.AsPrimitive, expr);
        switch (typeof exprAsValue) {
            case "object":
                return exprAsValue;
            case "function":
                return functionAsOpArgumentError;
            default:
                return fn(exprAsValue);
        }
    };
}

export const ops = {
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
} as const;

export type OpContext = typeof ops;

export type Formula = <O>(origin: O, context: CalcObj<O>) => [Pending<unknown>[], Delayed<CalcValue<O>>];

export const createRuntime = (): [Pending<unknown>[], Runtime] => {
    const [data, trace] = makeTracer();
    return [data, new CoreRuntime(trace)];
}
