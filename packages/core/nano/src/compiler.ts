import { Producer, Primitive, Consumer, CalcValue } from "./types";
import { assert, error } from "./debug";
import { ParserSink, createParser, SyntaxKind } from "./parser";



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
    [SyntaxKind.LessThanEqualsToken]: "lte",
    [SyntaxKind.GreaterThanEqualsToken]: "gte",
    [SyntaxKind.NotEqualsToken]: "ne",
} as const;

type OperationsMap = typeof operationsMap;
type Operations = OperationsMap[keyof OperationsMap];

function outputConditional(args: string[]): string {
    switch (args.length) {
        case 2: return `${args[0]}?${args[1]}:${false}`
        case 3: return `${args[0]}?${args[1]}:${args[2]}`
        default: return error("Unable to compile IF");
    }
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
    field(label: string) {
        return label;
    },
    paren(expr: string) {
        return `(${expr})`;
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
    binOp(op: SyntaxKind, left: string, right: string) {
        const opStr = "ops." + (operationsMap as Record<SyntaxKind, string>)[op];
        return opStr === undefined ? error(`Cannot compile op: ${op}`) : `${opStr}(host,cont,${left},${right})`;
    },
    missing() {
        return `undefined`;
    }
};

/**
 * Runtime logic
 */

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

type TinyCalcBinOp = (host: Consumer, k: ContContext, l: CalcValue, r: CalcValue) => CalcValue;
function liftBinOp(fn: (l: Primitive, r: Primitive) => CalcValue): TinyCalcBinOp {
    return (host, k, l, r) => {
        // Assumes that asValue returns a primitive value. We should work this out.
        if (typeof l === "object") {
            const unboxedL = l.request(host, "asValue", k.then as (v: CalcValue) => Primitive, k.catch);
            if (typeof r === "object") {
                return fn(
                    unboxedL,
                    r.request(host, "asValue", k.then as (v: CalcValue) => Primitive, k.catch)
                );
            }
            return fn(unboxedL, r);
        }
        if (typeof r === "object") {
            return fn(l, r.request(host, "asValue", k.then as (v: CalcValue) => Primitive, k.catch));
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
 * Compilation
 */

type RawFormula = (host: Consumer, context: Producer, k: ContContext, math: OpContext) => CalcValue;
export type Formula = (host: Consumer, context: Producer) => CalcValue;
const formula = (raw: RawFormula): Formula => (host: Consumer, context: Producer) => raw(host, context, cont, ops);
export const parse = createParser(simpleSink);
export const compile = (text: string) => {
    const [errors, parsed] = parse(text);
    assert(errors.length === 0);
    const f = formula(new Function("host", "context", "cont", "ops", `return ${parsed};`) as RawFormula);
    return f;
};
