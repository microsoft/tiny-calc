import { Resource, Primitive, CalcHost, CalcValue } from "./types";
import { error } from "./debug";
import { ParserSink, Op, runParser, SyntaxKind } from "./parser";

function op2String(op: Op) {
    switch (op) {
        case SyntaxKind.PlusToken:
            return "ops.plus";
        case SyntaxKind.MinusToken:
            return "ops.minus";
        case SyntaxKind.AsteriskToken:
            return "ops.mult";
        case SyntaxKind.SlashToken:
            return "ops.div";
    }
}

const simpleSink: ParserSink<string> = {
    lit(value: number | string | boolean) {
        return JSON.stringify(value);
    },
    ident(id: string) {
        return `context.request(host, ${JSON.stringify(id)}, cont.then, cont.catch)`;
    },
    fun(identifer: string[], body: string) {
        return error("Not implemented");
    },
    app(head: string, ...args: string[]) {
        return error("Not implemented");
    },
    dot(left: string, right: string) {
        return `${left}.request(host, ${right}, cont.then, cont.catch)`;
    },
    binOp(op: Op, left: string, right: string) {
        const opStr = op2String(op);
        return `${opStr}(host, cont, ${left},${right})`;
    }
};

const parse = (input: string) => runParser(input, simpleSink);

const cont = {
    then: <X>(x: X) => x,
    catch: (e?: unknown) => {
        throw e;
    }
};

function liftBinOp(
    fn: (l: Primitive, r: Primitive) => CalcValue
): (host: CalcHost, k: typeof cont, l: CalcValue, r: CalcValue) => CalcValue {
    return (host, k, l, r) => {
        switch (typeof l) {
            case "object":
                const unboxedL = l.request<Primitive>(host, "asValue", k.then as any, k.catch);
                switch (typeof r) {
                    case "object":
                        // Assumes that asValue returns a primitive
                        return fn(unboxedL, r.request<Primitive>(host, "asValue", k.then as any, k.catch));
                    default:
                        return fn(unboxedL, r);
                }
            default:
                switch (typeof r) {
                    case "object":
                        // Assumes that asValue returns a primitive
                        return fn(l, r.request<Primitive>(host, "asValue", k.then as any, k.catch));
                    default:
                        return fn(l, r);
                }
        }
    };
}

const ops = {
    plus: liftBinOp((x: any, y: any) => x + y),
    minus: liftBinOp((x: any, y: any) => x - y),
    mult: liftBinOp((x: any, y: any) => x * y),
    div: liftBinOp((x: any, y: any) => x / y)
};

/**
 * Compilation
 */
type RawFormula = (host: CalcHost, context: Resource, k: typeof cont, math: typeof ops) => CalcValue;
export type Formula = (host: CalcHost, context: Resource) => CalcValue;
const formula = (raw: RawFormula): Formula => (host: CalcHost, context: Resource) => raw(host, context, cont, ops);
export const compile = (text: string) => {
    const parsed = parse(text);
    console.log(parsed);
    return formula(new Function("host", "context", "cont", "ops", `return ${parsed};`) as RawFormula);
};
