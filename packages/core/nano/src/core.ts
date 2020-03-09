import {
    CalcObj,
    CalcValue,
    CheckFn,
    DispatchPattern,
    NumericType,
    Pending,
    Primitive,
    TypedCalcObj,
    TypeMap,
    TypeName,
    Runtime,
    TypedBinOp,
    TypedUnaryOp,
} from "./types";

import { SyntaxKind } from "./parser"

/**
 *  Default error implementations for the runtime.
 *  These do not support enrichment.
 */

const errorMap: TypeMap<CalcObj<unknown>, unknown> = { [TypeName.Error]: { enrich: value => value } };

export function makeError(message: string): CalcObj<unknown> {
    return { typeMap: () => errorMap, serialise: () => message };
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

/**
 *  Default operator implementations for the runtime.
 *  These support type-based overloading.
 */

type NumberLike = number | TypedCalcObj<TypeName.Numeric, unknown>;
type CoercibleNumberLike = boolean | string | NumberLike;
type ComparableLike = Primitive | TypedCalcObj<TypeName.Comparable, unknown>;

const checkNum: CheckFn<NumberLike> = (_context, value, _pos): value is NumberLike => {
    switch (typeof value) {
        case "number": return true;
        case "object": return value.typeMap()[TypeName.Numeric] !== undefined;
        default: return false;
    }
}

function createPrimObjCheck<T extends TypeName>(name: T): CheckFn<Primitive | TypedCalcObj<T, unknown>> {
    return (_context, value, _pos): value is Primitive | TypedCalcObj<T, unknown> => {
        switch (typeof value) {
            case "number":
            case "boolean":
            case "string": return true;
            case "object": return value.typeMap()[name] !== undefined;
            default: return false;
        }
    }
}

const checkNumericOrPrim = createPrimObjCheck(TypeName.Numeric);
const checkComparable = createPrimObjCheck(TypeName.Comparable);
const typeErrorOrForward = <C>(_: C, value: CalcValue<C>) => (typeof value === "object" && value.typeMap()[TypeName.Error]) ? value : typeError;

/**
 * We use the following to fake an existential type. We really want to
 * have something like: exists U. TypedBinOp<U>, where the `check`
 * function of the typed op is used produces values of sealed type.
 * Once a value is checked, it can then be passed to the op.
 *
 * We can't do this so we just forge some unique type that at least
 * lets us store all binary operations in a single map.
 */

declare const $skolem: unique symbol;
export type Skolem = { [$skolem]: unknown };
function pack<T, U>(op: TypedBinOp<T>): TypedBinOp<U> {
    return op as any;
}

function createNumericUnaryOp(fnPrim: (l: number) => CalcValue<unknown>, fnDispatch: Extract<keyof NumericType<unknown, unknown>, 'negate'> | undefined) {
    const op: TypedUnaryOp<NumberLike> = {
        check: checkNum,
        fn: (context, value) => {
            if (typeof value === "number") {
                return fnPrim(value);
            }
            if (fnDispatch === undefined) { return value; }
            const tm = value.typeMap()[TypeName.Numeric];
            return tm[fnDispatch](value, context);
        },
        blame: typeErrorOrForward
    };
    return op as unknown as TypedUnaryOp<Skolem>;
}

function createNumericBinOp(fnPrim: (l: Primitive, r: Primitive) => CalcValue<unknown>, fnDispatch: Exclude<keyof NumericType<unknown, unknown>, 'negate'>) {
    const op: TypedBinOp<CoercibleNumberLike> = {
        check: checkNumericOrPrim,
        fn: (context, l, r) => {
            if (typeof l === "object") {
                const m1 = l.typeMap()[TypeName.Numeric];
                if (typeof r === "object") {
                    return m1 === r.typeMap()[TypeName.Numeric] ?
                        m1[fnDispatch](DispatchPattern.Both, l, r, context) :
                        typeError;
                }
                if (typeof r === "number") {
                    return m1[fnDispatch](DispatchPattern.L, l, r, context);
                }
                return typeError;
            }
            if (typeof r === "object") {
                const m2 = r.typeMap()[TypeName.Numeric];
                if (typeof l === "number") {
                    return m2[fnDispatch](DispatchPattern.R, l, r, context);
                }
                return typeError;
            }
            return fnPrim(l, r);
        },
        blame: typeErrorOrForward
    };
    return pack<CoercibleNumberLike, Skolem>(op);
}

function createComparableBinOp(fnPrim: (l: Primitive, r: Primitive) => CalcValue<unknown>, fnDispatch: <C>(result: number | CalcObj<C>) => CalcValue<C>) {
    const op: TypedBinOp<ComparableLike> = {
        check: checkComparable,
        fn: (context, l, r) => {
            if (typeof l === "object") {
                const m1 = l.typeMap()[TypeName.Comparable];
                if (typeof r === "object") {
                    return fnDispatch(
                        m1 === r.typeMap()[TypeName.Comparable] ?
                            m1.compare(DispatchPattern.Both, l, r, context) :
                            typeError
                    );
                }
                return fnDispatch(m1.compare(DispatchPattern.L, l, r, context));
            }
            if (typeof r === "object") {
                const m2 = r.typeMap()[TypeName.Comparable];
                return fnDispatch(m2.compare(DispatchPattern.R, l, r, context));
            }
            return fnPrim(l, r);
        },
        blame: typeErrorOrForward
    };
    return pack<ComparableLike, Skolem>(op);
}

export const binOps = {
    [SyntaxKind.PlusToken]: createNumericBinOp(
        (x, y) => <any>x + <any>y,
        "plus"
    ),
    [SyntaxKind.MinusToken]: createNumericBinOp(
        (x, y) => <any>x - <any>y,
        "minus"
    ),
    [SyntaxKind.AsteriskToken]: createNumericBinOp(
        (x, y) => <any>x * <any>y,
        "mult"
    ),
    [SyntaxKind.SlashToken]: createNumericBinOp(
        (x: any, y: any) => y === 0 ? errors.div0 : x / y,
        "div"
    ),
    [SyntaxKind.EqualsToken]: createComparableBinOp(
        (x: any, y: any) => x === y,
        result => typeof result === "object" ? result : result === 0
    ),
    [SyntaxKind.LessThanToken]: createComparableBinOp(
        (x: any, y: any) => x < y,
        result => typeof result === "object" ? result : result < 0
    ),
    [SyntaxKind.GreaterThanToken]: createComparableBinOp(
        (x: any, y: any) => x > y,
        result => typeof result === "object" ? result : result > 0
    ),
    [SyntaxKind.LessThanEqualsToken]: createComparableBinOp(
        (x: any, y: any) => x <= y,
        result => typeof result === "object" ? result : result <= 0
    ),
    [SyntaxKind.GreaterThanEqualsToken]: createComparableBinOp(
        (x: any, y: any) => x >= y,
        result => typeof result === "object" ? result : result >= 0
    ),
    [SyntaxKind.NotEqualsToken]: createComparableBinOp(
        (x: any, y: any) => x !== y,
        result => typeof result === "object" ? result : result !== 0
    ),
} as const;

export const unaryOps = {
    [SyntaxKind.PlusToken]: createNumericUnaryOp((x: any) => x, undefined),
    [SyntaxKind.MinusToken]: createNumericUnaryOp((x: any) => -x, "negate"),
} as const;

/**
 *  Default runtime implementation.  This supports applicative tracing
 *  of pending values and will attempt to find all pending
 *  computations before exiting. 
 */

declare const $effect: unique symbol;
export type Delay = { [$effect]: unknown };
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

function tryDeref<C>(trace: Trace, context: C, receiver: CalcObj<C>) {
    const ref = receiver.typeMap()[TypeName.Reference];
    if (ref) {
        return trace(ref.dereference(receiver, context));
    }
    return undefined;
}

function errorOr<C, F>(value: CalcObj<C>, fallback: F): CalcObj<C> | F {
    return value.typeMap()[TypeName.Error] ? value : fallback;
}

/** 
 * Core Tracing Runtime
 * 
 * Returns evaluated calc values or the sentinel `Delay` value.
 * To find the actual `Pending` values see the results of `trace`.
 */
export class CoreRuntime implements Runtime<Delay> {
    constructor(public trace: Trace) { }

    isDelayed = isDelayed
    
    read<C, F>(context: C, receiver: Delayed<CalcValue<C>>, prop: string, fallback: F): Delayed<CalcValue<C> | F> {
        if (isDelayed(receiver)) { return receiver; }
        if (typeof receiver === "object") {
            let reader = receiver.typeMap()[TypeName.Readable];
            if (reader) {
                return this.trace(reader.read(receiver, prop, context));
            }
            const value = tryDeref(this.trace, context, receiver);
            if (isDelayed(value)) { return receiver; }
            if (value === undefined) {
                return errorOr(receiver, fallback);
            }
            if (typeof value === "object") {
                reader = value.typeMap()[TypeName.Readable];
                if (reader) {
                    return this.trace(reader.read(value, prop, context));
                }
                return errorOr(value, fallback);
            }
        }
        return fallback;
    }

    ifS<R>(cond: Delayed<boolean>, cont: (cond: boolean) => Delayed<R>): Delayed<R> {
        return isDelayed(cond) ? cond : cont(cond);
    }

    app1<A, C>(context: C, op: TypedUnaryOp<A>, expr: Delayed<CalcValue<C>>): Delayed<CalcValue<C>> {
        if (isDelayed(expr)) { return expr; }
        let value: CalcValue<C> = expr;
        if (typeof value === "object") {
            if (op.check(context, value, 0)) {
                return op.fn(context, value);
            }
            const redemption = tryDeref(this.trace, context, value);
            if (redemption === undefined) {
                return op.blame(context, value, 0);
            }
            if (isDelayed(redemption)) {
                return redemption;
            }
            value = redemption;
        }
        if (typeof value === "function" || !op.check(context, value, 0)) {
            return op.blame(context, value, 0);
        }
        return op.fn(context, value)
    }

    app2<A, C>(context: C, op: TypedBinOp<A>, l: Delayed<CalcValue<C>>, r: Delayed<CalcValue<C>>): Delayed<CalcValue<C>> {
        let value1: Delayed<CalcValue<C>> | undefined = l;
        let value2: Delayed<CalcValue<C>> | undefined = r;
        if (!isDelayed(value1) && typeof value1 === "object" && !op.check(context, value1, 0)) {
            value1 = tryDeref(this.trace, context, value1);
        }
        if (!isDelayed(value2) && typeof value2 === "object" && !op.check(context, value2, 1)) {
            value2 = tryDeref(this.trace, context, value2);
        }
        if (isDelayed(value1)) { return value1; }
        if (isDelayed(value2)) { return value2; }
        if (value1 === undefined) {
            // This cast is safe because value1 can only be undefined if !isDelayed(l) is true.
            return op.blame(context, l as CalcValue<C>, 0);
        }
        if (value2 === undefined) {
            return op.blame(context, r as CalcValue<C>, 1);
        }
        if (typeof value1 === "function" || !op.check(context, value1, 0)) {
            return op.blame(context, value1, 0);
        }
        if (typeof value2 === "function" || !op.check(context, value2, 1)) {
            return op.blame(context, value2, 1);
        }
        return op.fn(context, value1, value2);
    }

    appN<C, F>(context: C, fn: Delayed<CalcValue<C>>, args: Delayed<CalcValue<C>>[], fallback: F): Delayed<CalcValue<C> | F> {
        if (isDelayed(fn)) { return fn };
        let target: Delayed<CalcValue<C>> | undefined = fn;
        if (typeof fn === "object") {
            target = tryDeref(this.trace, context, fn);
            if (target === undefined) {
                return errorOr(fn, fallback);
            }
        }
        if (isDelayed(target)) { return target; }
        for (let i = 0; i < args.length; i += 1) {
            if (isDelayed(args[i])) { return args[i] };
        }
        switch (typeof target) {
            case "object": return errorOr(target, fallback);
            case "function": return target(this, context, args as CalcValue<C>[]);
            default: return fallback;
        }
    }
}

/**
 * Exports the basic building blocks of a formula runtime.
 * - Error values
 * - Operator implementations.
 * - An effect-handling runtime.
 */

export type Errors = typeof errors;
export type BinaryOps = typeof binOps;
export type UnaryOps = typeof unaryOps;

export const createRuntime = (): [Pending<unknown>[], Runtime<Delay>] => {
    const [data, trace] = makeTracer();
    return [data, new CoreRuntime(trace)];
}
