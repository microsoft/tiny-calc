import { CalcObj, CalcValue, Pending, Primitive } from "./types";
import { SyntaxKind } from "./parser";

export const enum ObjProps {
    AsString = "stringify",
    AsPrimitive = "value",
}

export function makeError(message: string): CalcObj<unknown> {
    return {
        send(property) {
            if (property === ObjProps.AsString) { return message };
            return this;
        }
    };
}

const appOnNonFunction = makeError("The target of an application must be a calc function.");
const div0 = makeError("#DIV/0!");
const functionArity = makeError("#ARITY!");
const functionAsOpArgument = makeError("Operator argument must be a primitive.");
const nonStringField = makeError("A field expression must be of type string");
const readOnNonObject = makeError("The target of a dot-operation must be a calc object.");

export const errors = {
    appOnNonFunction,
    div0,
    functionArity,
    functionAsOpArgument,
    nonStringField,
    readOnNonObject,
} as const;

export type Errors = typeof errors;

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
 */
export interface Runtime {
    read: <C, F>(context: C, receiver: Delayed<CalcValue<C>>, prop: string, fallback: F) => Delayed<CalcValue<C> | F>;
    ifS: <T>(cond: Delayed<boolean>, cont: (cond: boolean) => Delayed<T>) => Delayed<T>;
    app1: <C, T, U>(context: C, op: (runtime: Runtime, context: C, expr: T) => U, expr: Delayed<T>) => Delayed<U>;
    app2: <C, T, U, V>(context: C, op: (runtime: Runtime, context: C, l: T, r: U) => V, l: Delayed<T>, r: Delayed<U>) => Delayed<V>;
    appN: <C, F>(context: C, fn: Delayed<CalcValue<C>>, args: Delayed<CalcValue<C>>[], fallback: F) => Delayed<CalcValue<C> | F>;
}

class CoreRuntime {
    constructor(public trace: Trace) { }

    read<C, F>(context: C, receiver: Delayed<CalcValue<C>>, prop: string, fallback: F): Delayed<CalcValue<C> | F> {
        if (isDelayed(receiver)) { return delay }
        return typeof receiver === "object" ? this.trace(receiver.send(prop, context)) : fallback;
    }

    ifS<T>(cond: Delayed<boolean>, cont: (cond: boolean) => Delayed<T>): Delayed<T> {
        return isDelayed(cond) ? cond : cont(cond);
    }

    app1<C, T, U>(context: C, op: (runtime: Runtime, context: C, expr: T) => U, expr: Delayed<T>): Delayed<U> {
        return isDelayed(expr) ? delay : op(this, context, expr);
    }

    app2<C, T, U, V>(context: C, op: (runtime: Runtime, context: C, l: T, r: U) => V, l: Delayed<T>, r: Delayed<U>): Delayed<V> {
        return isDelayed(l) || isDelayed(r) ? delay : op(this, context, l, r);
    }

    appN<C, F>(context: C, fn: Delayed<CalcValue<C>>, args: Delayed<CalcValue<C>>[], fallback: F): Delayed<CalcValue<C> | F> {
        if (isDelayed(fn)) { return delay };
        let target: Delayed<CalcValue<C>> = fn;
        if (typeof target === "object") {
            target = this.trace(target.send(ObjProps.AsPrimitive, context));
        }
        if (isDelayed(target)) { return delay; }
        if (typeof target !== "function") { return fallback; }
        for (let i = 0; i < args.length; i += 1) {
            if (isDelayed(args[i])) { return delay };
        }
        return target(this, context, args as CalcValue<C>[]);
    }
}

type CoreBinOp = <C>(runtime: Runtime, context: C, l: CalcValue<C>, r: CalcValue<C>) => Delayed<CalcValue<C>>;
type CoreUnaryOp = <C>(runtime: Runtime, context: C, expr: CalcValue<C>) => Delayed<CalcValue<C>>;

function liftBinOp(fn: (l: Primitive, r: Primitive) => CalcValue<unknown>): CoreBinOp {
    return (runtime, context, l, r) => {
        const lAsValue = runtime.read(context, l, ObjProps.AsPrimitive, l);
        const rAsValue = runtime.read(context, r, ObjProps.AsPrimitive, r);
        if (isDelayed(lAsValue) || isDelayed(rAsValue)) { return delay; }
        if (typeof lAsValue === "object") { return lAsValue; }
        if (typeof lAsValue === "function") { return functionAsOpArgument; }
        if (typeof rAsValue === "function") { return functionAsOpArgument; }
        if (typeof rAsValue === "object") { return rAsValue; }
        return fn(lAsValue, rAsValue);
    };
}

function liftUnaryOp(fn: (expr: Primitive) => Primitive): CoreUnaryOp {
    return (runtime, context, expr) => {
        const exprAsValue = runtime.read(context, expr, ObjProps.AsPrimitive, expr);
        switch (typeof exprAsValue) {
            case "object":
                return exprAsValue;
            case "function":
                return functionAsOpArgument;
            default:
                return fn(exprAsValue);
        }
    };
}

export const binOps = {
    [SyntaxKind.PlusToken]: liftBinOp((x: any, y: any) => x + y),
    [SyntaxKind.MinusToken]: liftBinOp((x: any, y: any) => x - y),
    [SyntaxKind.AsteriskToken]: liftBinOp((x: any, y: any) => x * y),
    [SyntaxKind.SlashToken]: liftBinOp((x: any, y: any) => y === 0 ? errors.div0 : x / y),
    [SyntaxKind.EqualsToken]: liftBinOp((x: any, y: any) => x === y),
    [SyntaxKind.LessThanToken]: liftBinOp((x: any, y: any) => x < y),
    [SyntaxKind.GreaterThanToken]: liftBinOp((x: any, y: any) => x > y),
    [SyntaxKind.LessThanEqualsToken]: liftBinOp((x: any, y: any) => x <= y),
    [SyntaxKind.GreaterThanEqualsToken]: liftBinOp((x: any, y: any) => x >= y),
    [SyntaxKind.NotEqualsToken]: liftBinOp((x: any, y: any) => x !== y)
} as const;

export const unaryOps = {
    [SyntaxKind.PlusToken]: ((_rt: any, _o: any, x: any) => x) as CoreUnaryOp,
    [SyntaxKind.MinusToken]: liftUnaryOp((x: any) => -x)
} as const;

export type BinaryOps = typeof binOps;
export type UnaryOps = typeof unaryOps;

export type Formula = <C>(context: C, root: CalcObj<C>) => [Pending<unknown>[], Delayed<CalcValue<C>>];

export const createRuntime = (): [Pending<unknown>[], Runtime] => {
    const [data, trace] = makeTracer();
    return [data, new CoreRuntime(trace)];
}
