import { Pending } from "./types";
import { assert, error } from "./debug";
import { ParserSink, createParser, SyntaxKind } from "./parser";



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
type Trace = <T>(value: T | Pending<T>) => Delayed<T>;

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
    req: <O>(trace: Trace, host: O, context: Delayed<CalcObj<O>>, prop: string) => Delayed<CalcValue<O>>;
    select: <L, R>(cond: Delayed<boolean>, l: () => Delayed<L>, r: () => Delayed<R>) => Delayed<L | R>;
    app2: <O, A, B, C>(trace: Trace, host: O, op: <O>(trace: Trace, host: O, l: A, r: B) => C, l: Delayed<A>, r: Delayed<B>) => Delayed<C>;
    app: <O>(trace: Trace, host: O, fn: Delayed<CalcFun<O>>, args: Delayed<CalcValue<O>>[]) => Delayed<CalcValue<O>>;
}

function req<O>(trace: Trace, host: O, context: Delayed<CalcObj<O>>, prop: string): Delayed<CalcValue<O>> {
    return isDelayed(context) ? delay : trace(context.request(host, prop));
}

function select<L, R>(cond: Delayed<boolean>, l: () => Delayed<L>, r: () => Delayed<R>): Delayed<L | R> {
    return isDelayed(cond) ? cond : cond ? l() : r();
}

function app2<O, A, B, C>(trace: Trace, host: O, op: <O>(trace: Trace, host: O, l: A, r: B) => C, l: Delayed<A>, r: Delayed<B>): Delayed<C> {
    return isDelayed(l) || isDelayed(r) ? delay : op(trace, host, l, r);
}

function app<O, A, B>(trace: Trace, host: O, fn: Delayed<(trace: Trace, origin: O, args: A[]) => Delayed<B>>, args: Delayed<A>[]): Delayed<B> {
    if (isDelayed(fn)) { return delay };
    for (let i = 0; i < args.length; i += 1) {
        if (isDelayed(args[i])) { return delay };
    }
    return fn(trace, host, args as A[]);
}

const ef: LiftedCore = { req, select, app2, app };



/**
 * Calc Values
 */

export type Primitive = number | string | boolean;

// TODO: Support Completions
export interface CalcObj<O> {
    request(origin: O, property: string, ...args: any[]): CalcValue<O> | Pending<CalcValue<O>>;
}

export interface CalcFun<O> {
    (trace: Trace, origin: O, args: CalcValue<O>[]): Delayed<CalcValue<O>>;
}

export type CalcValue<O> = Primitive | CalcObj<O> | CalcFun<O>;



/**
 * Operations
 */

const operationsMap = {
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

type OperationsMap = typeof operationsMap;
type Operations = OperationsMap[keyof OperationsMap];
type TinyCalcBinOp = <O>(trace: Trace, host: O, l: CalcValue<O>, r: CalcValue<O>) => Delayed<CalcValue<O>>;

function liftBinOp(fn: (l: Primitive, r: Primitive) => Primitive): TinyCalcBinOp {
    // TODO: Assertions on request.value
    return (trace, host, l, r) => {
        if (typeof l === "object") {
            const unboxedL = trace(l.request(host, "value")) as Delayed<Primitive>;
            if (typeof r === "object") {
                const unboxedR = trace(r.request(host, "value")) as Delayed<Primitive>;
                /* 
                 * Equivalent to:
                 * app2(
                 *   trace, 
                 *   host, 
                 *   (_trace, _host, l, r) => fn(l, r), 
                 *   trace(l.request(host, "value")),
                 *   trace(r.request(host, "value"))
                 *  ); 
                 */
                return isDelayed(unboxedL) || isDelayed(unboxedR) ? delay : fn(unboxedL, unboxedR);
            }
            if (typeof r === "function") {
                return error("TODO: function fallback");
            }
            return isDelayed(unboxedL) ? delay : fn(unboxedL, r);
        }
        if (typeof l === "function") {
            return error("TODO: function fallback");
        }
        if (typeof r === "object") {
            const unboxedR = trace(r.request(host, "value")) as Delayed<Primitive>;
            return isDelayed(unboxedR) ? delay : fn(l, unboxedR);
        }
        if (typeof r === "function") {
            return error("TODO: function fallback");
        }
        return fn(l, r);
    };
}

type OpContext = Record<Operations, TinyCalcBinOp>;
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
    ne: liftBinOp((x: any, y: any) => x !== y)
};



/**
 * Code-gen
 */

function outputConditional(args: string[]): string {
    if (args.length < 2) {
        return error("Unable to compile conditional");
    }
    const rightExpr = args[2] === undefined ? "false" : args[2];
    return `ef.select(${args[0]},function(){return ${args[1]};},function(){return ${rightExpr};})`
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
    app(head: string, args: string[]) {
        switch (head) {
            case "IF":
                return outputConditional(args);
            default:
                return `ef.app(trace,host,${head},[${args}])`;
        }
    },
    dot(left: string, right: string) {
        return `ef.req(trace,host,${left},${right})`;
    },
    binOp(op: SyntaxKind, left: string, right: string) {
        const opStr = "ops." + (operationsMap as Record<SyntaxKind, string>)[op];
        assert(opStr !== undefined);
        return `ef.app2(trace,host,${opStr},${left},${right})`;
    },
    missing() {
        return error("Cannot compile missing");
    }
};



/**
 * Compilation
 */

type RawFormula = <O>(trace: Trace, host: O, context: CalcValue<O>, ops: OpContext, ef: LiftedCore) => Delayed<CalcValue<O>>;

export type Formula = <O>(host: O, context: CalcValue<O>) => [Pending<unknown>[], Delayed<CalcValue<O>>];

const parse = createParser(simpleSink);

const formula = (raw: RawFormula): Formula => <O>(host: O, context: CalcValue<O>) => {
    const [data, trace] = makeTracer();
    const result = raw(trace, host, context, ops, ef);
    return [data, result]
}

export const compile = (text: string) => {
    const [errors, parsed] = parse(text);
    // TODO: Error handling.
    assert(errors.length === 0);
    return formula(new Function("trace", "host", "context", "ops", "ef", `return ${parsed};`) as RawFormula);
};
