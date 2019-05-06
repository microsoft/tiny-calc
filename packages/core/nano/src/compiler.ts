import { error } from "./debug";
import { ParserSink, Op, runParser, SyntaxKind } from "./parser";



/**
 * Code-gen
 */

const operationsMap = {
    [SyntaxKind.PlusToken]: "plus",
    [SyntaxKind.MinusToken]: "minus",
    [SyntaxKind.AsteriskToken]: "mult",
    [SyntaxKind.SlashToken]: "div",
    [SyntaxKind.EqualsToken]: "eq",
    [SyntaxKind.LessThanToken]: "lt",
    [SyntaxKind.GreaterThanToken]: "gt",
    [SyntaxKind.LessThanOrEqualToken]: "lte",
    [SyntaxKind.GreaterThanOrEqualToken]: "gte",
    [SyntaxKind.NotEqualsToken]: "ne",
} as const;

type OperationsMap = typeof operationsMap;
type Operations = OperationsMap[keyof OperationsMap];

function outputConditional(args: string[]): string {
    if (args.length === 3) {
        return `${args[0]}?${args[1]}:${args[2]}`
    }
    if (args.length === 2) {
        return `${args[0]}?${args[1]}:${false}`
    }
    return error("Unable to compile IF");
}

const simpleSink: ParserSink<string> = {
    lit(value: number | string | boolean) {
        return JSON.stringify(value);
    },
    ident(id: string) {
        if (id === "IF") {
            return id;
        }
        return `context.request(host,${JSON.stringify(id)},cont.then,cont.catch)`;
    },
    fun(identifer: string[], body: string) {
        return error("Not implemented -- fun");
    },
    app(head: string, args: string[]) {
        switch (head) {
            case "IF":
                return outputConditional(args);
            default:
                return `${head}(${args.join(",")})`
        }
    },
    dot(left: string, right: string) {
        return `${left}.request(host,${right},cont.then,cont.catch)`;
    },
    binOp(op: Op, left: string, right: string) {
        const opStr = "ops." + operationsMap[op];
        return `${opStr}(host,cont,${left},${right})`;
    }
};

const parse = (input: string) => runParser(input, simpleSink);



/**
 * Runtime logic
 */
export type Primitive = number | string | boolean;
export interface CalcObject<O> {
    request: <R>(
        origin: O,
        property: string,
        cont: (v: CalcValue<O>) => R,
        reject: (err?: unknown) => R,
        ...args: any[]
    ) => R;
}
export type CalcValue<O> = Primitive | CalcObject<O>

interface ContContext {
    then: <X>(x: X) => X;
    catch: (e?: unknown) => never;
}

const cont: ContContext = {
    then: <X>(x: X) => x,
    catch: (e?: unknown) => {
        throw e;
    }
};

type TinyCalcBinOp = <O>(host: O, k: ContContext, l: CalcValue<O>, r: CalcValue<O>) => CalcValue<O>;
function liftBinOp(fn: (l: Primitive, r: Primitive) => Primitive): TinyCalcBinOp {
    return (host, k, l, r) => {
        if (typeof l === "object") {
            const unboxedL = l.request(host, "value", k.then, k.catch) as Primitive;
            if (typeof r === "object") {
                return fn(unboxedL, r.request(host, "value", k.then, k.catch) as Primitive);
            }
            return fn(unboxedL, r);
        }
        if (typeof r === "object") {
            return fn(l, r.request(host, "value", k.then, k.catch) as Primitive);
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
 * Compilation and Evaluation
 */
type RawFormula = <O>(host: O, context: CalcObject<O>, k: ContContext, math: OpContext) => CalcValue<O>;
export type Formula = <O>(host: O, context: CalcObject<O>) => CalcValue<O>;
const formula = (raw: RawFormula): Formula => <O>(host: O, context: CalcObject<O>) => raw(host, context, cont, ops);

export const compile = (text: string) => {
    const parsed = parse(text);
    return formula(new Function("host", "context", "cont", "ops", `return ${parsed};`) as RawFormula);
};
