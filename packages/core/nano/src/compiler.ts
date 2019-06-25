import { Pending } from "./types";
import { assert } from "./debug";
import {
    createParser,
    ParserErrorHandler,
    ParserSink,
    SyntaxKind
} from "./parser";



/**
 * Calc Values
 */

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
            if (property === "toString") { return message };
            return this;
        }
    };
}

const requestOnNonObjectError = makeError("The target of a dot-operation must be a calc object.");
const appOnNonFunctionError = makeError("The target of an application must be a calc function.");
const functionAsOpArgumentError = makeError("Operator argument must be a primitive.");

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

function makeTracer(): [Pending<unknown>[], Trace] {
    // The trace function is used to catch pending values early and
    // replace them with a sentinel so that we can use pointer
    // equality throughout the rest of a calculataion. The
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
interface LiftedCore {
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
    if (typeof fn !== "function") { return appOnNonFunctionError; }
    for (let i = 0; i < args.length; i += 1) {
        if (isDelayed(args[i])) { return delay };
    }
    return fn(trace, host, args as CalcValue<O>[]);
}

const ef: LiftedCore = { req, select, app1, app2, appN };



/**
 * Operations
 */

const binaryOperationsMap = {
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

const unaryOperationsMap = {
    [SyntaxKind.MinusToken]: "negate",
} as const;

type BinaryOperations = typeof binaryOperationsMap;
type UnaryOperations = typeof unaryOperationsMap;
type Operations = BinaryOperations[keyof BinaryOperations] | UnaryOperations[keyof UnaryOperations];
type TinyCalcBinOp = <O>(trace: Trace, host: O, l: CalcValue<O>, r: CalcValue<O>) => Delayed<CalcValue<O>>;
type TinyCalcUnaryOp = <O>(trace: Trace, host: O, expr: CalcValue<O>) => Delayed<CalcValue<O>>;

function liftBinOp(fn: (l: Primitive, r: Primitive) => Primitive): TinyCalcBinOp {
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

type OpContext = Record<Operations, TinyCalcBinOp | TinyCalcUnaryOp>;
const ops: OpContext = {
    plus: liftBinOp((x: any, y: any) => x + y),
    minus: liftBinOp((x: any, y: any) => x - y),
    mult: liftBinOp((x: any, y: any) => x * y),
    div: liftBinOp((x: any, y: any) => x / y),
    eq: liftBinOp((x: any, y: any) => x === y),
    lt: liftBinOp((x: any, y: any) => x < y),
    gt: liftBinOp((x: any, y: any) => x > y),
    lte: liftBinOp((x: any, y: any) => x <= y),
    gte: liftBinOp((x: any, y: any) => x >= y),
    ne: liftBinOp((x: any, y: any) => x !== y),
    negate: liftUnaryOp((x: any) => -x),
};



/**
 * Code-gen
 */

export const createErrorHandler: () => ParserErrorHandler<boolean> = () => {
    let errors = false;
    return {
        errors: () => errors,
        reset: () => { errors = false; return },
        onError: () => { errors = true; return }
    }
}

const errorHandler = createErrorHandler();

function outputConditional(args: string[], start: number, end: number): string {
    if (args.length === 0) {
        errorHandler.onError("missing conditional arguments", start, end);
        return "";
    }
    const trueExpr = args[1] === undefined ? "true" : args[1];
    const falseExpr = args[2] === undefined ? "false" : args[2];
    return `ef.select(${args[0]},function(){return ${trueExpr};},function(){return ${falseExpr};})`
}

const simpleSink: ParserSink<string> = {
    lit(value: number | string | boolean) {
        return JSON.stringify(value);
    },
    ident(id: string) {
        if (id === "IF") {
            return id;
        }
        return `trace(context.request(host,${JSON.stringify(id)}))`;
    },
    field(label: string) {
        return JSON.stringify(label);
    },
    paren(expr: string) {
        return `(${expr})`;
    },
    app(head: string, args: string[], start: number, end: number) {
        switch (head) {
            case "IF":
                return outputConditional(args, start, end);
            default:
                return `ef.appN(trace,host,${head},[${args}])`;
        }
    },
    dot(left: string, right: string) {
        return `ef.req(trace,host,${left},${right})`;
    },
    binOp(op: SyntaxKind, left: string, right: string) {
        const opStr = "ops." + (binaryOperationsMap as Record<SyntaxKind, string>)[op];
        assert(opStr !== undefined);
        return `ef.app2(trace,host,${opStr},${left},${right})`;
    },
    unaryOp(op: SyntaxKind, expr: string) {
        if (op === SyntaxKind.MinusToken) {
            const opStr = "ops." + (unaryOperationsMap as Record<SyntaxKind, string>)[op];
            assert(opStr !== undefined);
            return `ef.app1(trace,host,${opStr},${expr})`;
        }
        return expr
    },
    missing(position: number) {
        errorHandler.onError("missing", position, position);
        return "";
    }
};



/**
 * Compilation
 */

type RawFormula = <O>(trace: Trace, host: O, context: CalcValue<O>, ops: OpContext, ef: LiftedCore) => Delayed<CalcValue<O>>;

export type Formula = <O>(host: O, context: CalcValue<O>) => [Pending<unknown>[], Delayed<CalcValue<O>>];

const parse = createParser(simpleSink, errorHandler);

const formula = (raw: RawFormula): Formula => <O>(host: O, context: CalcValue<O>) => {
    const [data, trace] = makeTracer();
    const result = raw(trace, host, context, ops, ef);
    return [data, result]
}

export const compile = (text: string) => {
    const [errors, parsed] = parse(text);
    if (errors) {
        return undefined;
    }
    return formula(new Function("trace", "host", "context", "ops", "ef", `return ${parsed};`) as RawFormula);
};
