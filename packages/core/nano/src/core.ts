import { assert } from "./debug"

import {
    CalcObj,
    CalcValue,
    DataValue,
    ErrorTrait,
    NumericTrait,
    Pending,
    Primitive,
    PrimordialTrait,
    Runtime,
    TypedBinOp,
    TypedUnaryOp,
} from "./types";

import { SyntaxKind } from "./parser"

export function makeError(message: string): CalcObj<unknown> & ErrorTrait<unknown> {
    const err: CalcObj<unknown> & ErrorTrait<unknown> = {
        acquire: t => (t === PrimordialTrait.Error ? err : undefined) as any,
        serialise: () => message,
        enrich: () => err
    }
    return err;
}

const appOnNonFunction = makeError("The target of an application must be a calc function.");
const div0 = makeError("#DIV/0!");
const functionArity = makeError("#ARITY!");
const functionAsOpArgument = makeError("Operator argument must be a primitive.");
const nonStringField = makeError("A field expression must be of type string");
const readOnNonObject = makeError("The target of a dot-operation must be a calc object.");
const typeError = makeError("#TYPE!");

export const errors = {
    appOnNonFunction,
    div0,
    functionArity,
    functionAsOpArgument,
    nonStringField,
    readOnNonObject,
    typeError
} as const;

export type Errors = typeof errors;

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

export function isDelayed<T>(x: T | Delay): x is Delay {
    return x === delay;
}

function tryDeref<C>(trace: Trace, context: C, receiver: CalcObj<C>) {
    const ref = receiver.acquire(PrimordialTrait.Reference);
    if (ref) {
        return trace(ref.dereference(context));
    }
    return undefined;
}

function typeCheckWithinRef<C>(trace: Trace, context: C, expected: PrimordialTrait, value: CalcObj<C>): Delayed<CalcValue<C>> {
    if (value.acquire(expected)) {
        return value;
    }
    const derefed = tryDeref(trace, context, value);
    if (derefed === undefined) {
        return value;
    }
    return derefed;
}

function isWellTyped<C>(value: CalcValue<C>, trait: PrimordialTrait): value is DataValue<C> {
    switch (typeof value) {
        case "object": return value.acquire(trait) !== undefined;
        default: return typeof value !== "function";
    }
}

function errorOr<C, F>(value: CalcObj<C>, fallback: F): CalcObj<C> | F {
    return value.acquire(PrimordialTrait.Error) ? value : fallback;
}

class CoreRuntime implements Runtime<Delay> {
    constructor(public trace: Trace) { }

    read<C, F>(context: C, receiver: Delayed<CalcValue<C>>, prop: string, fallback: F): Delayed<CalcValue<C> | F> {
        if (isDelayed(receiver)) { return delay }
        if (typeof receiver === "object") {
            let reader = receiver.acquire(PrimordialTrait.Readable);
            if (reader) {
                return this.trace(reader.read(prop, context));
            }
            const value = tryDeref(this.trace, context, receiver);
            if (isDelayed(value)) { return delay }
            if (value === undefined) {
                return errorOr(receiver, fallback);
            }
            if (typeof value === "object") {
                reader = receiver.acquire(PrimordialTrait.Readable);
                if (reader) {
                    return this.trace(reader.read(prop, context));
                }
                return errorOr(value, fallback);
            }
        }
        return fallback;
    }

    ifS<R>(cond: Delayed<boolean>, cont: (cond: boolean) => Delayed<R>): Delayed<R> {
        return isDelayed(cond) ? cond : cont(cond);
    }

    app1<C>(context: C, op: TypedUnaryOp, expr: Delayed<CalcValue<C>>): Delayed<CalcValue<C>> {
        if (isDelayed(expr)) { return delay; }
        let value: Delayed<CalcValue<C>> = expr;
        if (typeof value === "object") {
            value = typeCheckWithinRef(this.trace, context, op.trait, value);
            if (isDelayed(value)) {
                return value;
            }
        }
        return isWellTyped(value, op.trait) ? op.fn(context, value) : op.err(context, value);
    }

    app2<C>(context: C, op: TypedBinOp, l: Delayed<CalcValue<C>>, r: Delayed<CalcValue<C>>): Delayed<CalcValue<C>> {
        let value1: Delayed<CalcValue<C>> = l;
        let value2: Delayed<CalcValue<C>> = r;
        if (!isDelayed(value1) && typeof value1 === "object") {
            value1 = typeCheckWithinRef(this.trace, context, op.trait1, value1);
        }
        if (!isDelayed(value2) && typeof value2 === "object") {
            value2 = typeCheckWithinRef(this.trace, context, op.trait2, value2);
        }
        if (isDelayed(value1) || isDelayed(value2)) {
            return delay;
        }
        if (isWellTyped(value1, op.trait1)) {
            if (isWellTyped(value2, op.trait2)) {
                return op.fn(context, value1, value2);
            }
            return op.err(context, value2, 1);
        }
        return op.err(context, value1, 0);
    }

    appN<C, F>(context: C, fn: Delayed<CalcValue<C>>, args: Delayed<CalcValue<C>>[], fallback: F): Delayed<CalcValue<C> | F> {
        if (isDelayed(fn)) { return delay };
        let target: Delayed<CalcValue<C>> | undefined = fn;
        if (typeof fn === "object") {
            target = tryDeref(this.trace, context, fn);
            if (target === undefined) {
                return errorOr(fn, fallback);
            }
        }
        if (isDelayed(target)) { return delay; }
        for (let i = 0; i < args.length; i += 1) {
            if (isDelayed(args[i])) { return delay };
        }
        switch (typeof target) {
            case "object": return errorOr(target, fallback);
            case "function": return target(this, context, args as CalcValue<C>[]);
            default: return fallback;
        }
    }
}

const basicErrorHandler = <C>(_context: unknown, value: CalcValue<C>) => {
    if (typeof value === "object" && value.acquire(PrimordialTrait.Error)) {
        return value;
    }
    return typeError;
}

function createNumericBinOp(
    fnPrim: (l: Primitive, r: Primitive) => CalcValue<unknown>,
    fnDispatch: Exclude<keyof NumericTrait<unknown>, 'negate'>
) {
    const op: TypedBinOp = {
        trait1: PrimordialTrait.Numeric,
        trait2: PrimordialTrait.Numeric,
        fn: (context, l, r) => {
            const lTyped = typeof l === "object" ? l.acquire(PrimordialTrait.Numeric)! : l;
            const rTyped = typeof r === "object" ? r.acquire(PrimordialTrait.Numeric)! : r;
            assert(lTyped !== undefined, 'Failed typeCheck invariant');
            assert(rTyped !== undefined, 'Failed typeCheck invariant');
            if (typeof lTyped === "object") {
                if (typeof rTyped === "object" || typeof rTyped === "number") {
                    return lTyped[fnDispatch](/* left */ true, rTyped, context);
                }
                return typeError;
            }
            if (typeof rTyped === "object") {
                if (typeof lTyped === "object" || typeof lTyped === "number") {
                    return rTyped[fnDispatch](/* left */ false, lTyped, context);
                }
                return typeError;
            }
            // TODO: checking
            return fnPrim(lTyped, rTyped);
        },
        err: basicErrorHandler
    };
    return op;
}

function createNumericUnaryOp(
    fnPrim: (l: Primitive) => CalcValue<unknown>,
    fnDispatch: Extract<keyof NumericTrait<unknown>, 'negate'> | undefined
) {
    const op: TypedUnaryOp = {
        trait: PrimordialTrait.Numeric,
        fn: (context, value) => {
            const vTyped = typeof value === "object" ? value.acquire(PrimordialTrait.Numeric)! : value;
            assert(vTyped !== undefined, 'Failed typeCheck invariant');
            return typeof vTyped === "object" ?
                fnDispatch === undefined ? value : vTyped[fnDispatch](context)
                : fnPrim(vTyped);
        },
        err: basicErrorHandler
    };
    return op;
}

function createComparableBinOp(
    fnPrim: (l: Primitive, r: Primitive) => CalcValue<unknown>,
    fnDispatch: <C>(result: number | CalcObj<C>) => CalcValue<C>
) {
    const op: TypedBinOp = {
        trait1: PrimordialTrait.Comparable,
        trait2: PrimordialTrait.Comparable,
        fn: (context, l, r) => {
            const lTyped = typeof l === "object" ? l.acquire(PrimordialTrait.Comparable)! : l;
            const rTyped = typeof r === "object" ? r.acquire(PrimordialTrait.Comparable)! : r;
            assert(lTyped !== undefined, 'Failed typeCheck invariant');
            assert(rTyped !== undefined, 'Failed typeCheck invariant');
            if (typeof lTyped === "object") {
                if (typeof rTyped === "object" || typeof rTyped === "number") {
                    return fnDispatch(lTyped.compare(/* left */ true, rTyped, context));
                }
                return typeError;
            }
            if (typeof rTyped === "object") {
                if (typeof lTyped === "object" || typeof lTyped === "number") {
                    return fnDispatch(rTyped.compare(/* left */ false, lTyped, context));
                }
                return typeError;
            }
            // TODO: checking
            return fnPrim(lTyped, rTyped);
        },
        err: basicErrorHandler
    };
    return op;
}

export const binOps = {
    [SyntaxKind.PlusToken]: createNumericBinOp((x, y) => <any>x + <any>y, "plus"),
    [SyntaxKind.MinusToken]: createNumericBinOp((x, y) => <any>x - <any>y, "minus"),
    [SyntaxKind.AsteriskToken]: createNumericBinOp((x, y) => <any>x * <any>y, "times"),
    [SyntaxKind.SlashToken]: createNumericBinOp((x: any, y: any) => y === 0 ? errors.div0 : x / y, "div"),
    [SyntaxKind.EqualsToken]: createComparableBinOp((x: any, y: any) => x === y, result => typeof result === "object" ? result : result === 0),
    [SyntaxKind.LessThanToken]: createComparableBinOp((x: any, y: any) => x < y, result => typeof result === "object" ? result : result < 0),
    [SyntaxKind.GreaterThanToken]: createComparableBinOp((x: any, y: any) => x > y, result => typeof result === "object" ? result : result > 0),
    [SyntaxKind.LessThanEqualsToken]: createComparableBinOp((x: any, y: any) => x <= y, result => typeof result === "object" ? result : result <= 0),
    [SyntaxKind.GreaterThanEqualsToken]: createComparableBinOp((x: any, y: any) => x >= y, result => typeof result === "object" ? result : result >= 0),
    [SyntaxKind.NotEqualsToken]: createComparableBinOp((x: any, y: any) => x !== y, result => typeof result === "object" ? result : result !== 0),
} as const;


export const unaryOps = {
    [SyntaxKind.PlusToken]: createNumericUnaryOp((x: any) => x, undefined),
    [SyntaxKind.MinusToken]: createNumericUnaryOp((x: any) => -x, "negate"),
} as const;

export type BinaryOps = typeof binOps;
export type UnaryOps = typeof unaryOps;

export type Formula = <C>(context: C, root: CalcObj<C>) => [Pending<unknown>[], Delayed<CalcValue<C>>];

export const createRuntime = (): [Pending<unknown>[], Runtime<Delay>] => {
    const [data, trace] = makeTracer();
    return [data, new CoreRuntime(trace)];
}
