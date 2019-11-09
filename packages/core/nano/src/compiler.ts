import { assert, assertNever } from "./debug";

import {
    BinaryOperatorToken,
    createBooleanErrorHandler,
    createParser,
    SyntaxKind,
    UnaryOperatorToken,
} from "./parser";

import {
    binaryOperationsMap,
    CalcValue,
    Delayed,
    ef,
    Formula,
    LiftedCore,
    makeTracer,
    OpContext,
    ops,
    Trace,
    unaryOperationsMap,
} from "./core";

import { FormulaNode, NodeKind, parseFormula } from "./ast";

const needsASTCompilation = {};
const ifIdent = "trace(context.read(\"if\", host))";
const funIdent = "trace(context.read(\"fun\", host))";
const errorHandler = createBooleanErrorHandler();

function outputConditional(args: string[]): string {
    if (args.length === 0) {
        errorHandler.onError("missing conditional arguments", 0, 0);
        return "";
    }
    const trueExpr = args[1] === undefined ? "true" : args[1];
    const falseExpr = args[2] === undefined ? "false" : args[2];
    return `ef.select(${args[0]},function(){return ${trueExpr};},function(){return ${falseExpr};})`
}

const simpleSink = {
    lit(value: number | string | boolean) {
        return JSON.stringify(value);
    },
    ident(id: string, _flags: unknown, fieldAccess: boolean) {
        switch (id) {
            case "if":
            case "IF":
                return ifIdent;
            case "fun":
            case "FUN":
                return funIdent;
            default:
                return fieldAccess ? JSON.stringify(id): `trace(context.read(${JSON.stringify(id)},host))`;
        }
    },
    paren(expr: string) {
        return `(${expr})`;
    },
    app(head: string, args: string[]) {
        switch (head) {
            case ifIdent:
                return outputConditional(args);
            case funIdent:
                throw needsASTCompilation;
            default:
                return `ef.appN(trace,host,${head},[${args}])`;
        }
    },
    dot(left: string, right: string) {
        return `ef.read(trace,host,${left},${right})`;
    },
    binOp(op: BinaryOperatorToken, left: string, right: string) {
        const opStr = "ops." + binaryOperationsMap[op];
        return `ef.app2(trace,host,${opStr},${left},${right})`;
    },
    unaryOp(op: UnaryOperatorToken, expr: string) {
        if (op === SyntaxKind.MinusToken) {
            const opStr = "ops." + unaryOperationsMap[op];
            return `ef.app1(trace,host,${opStr},${expr})`;
        }
        return expr
    },
    missing() {
        errorHandler.onError("missing", 0, 0);
        return "";
    }
};

const makeGensym = () => {
    let gensym = 0;
    return () => {
        return gensym++;
    }
};

function compileAST(gensym: () => number, scope: Record<string, string>, f: FormulaNode): string {
    switch (f.kind) {
        case NodeKind.Literal:
            return simpleSink.lit(f.value);

        case NodeKind.Ident:
            if (scope[f.value] !== undefined) {
                return scope[f.value];
            }
            return simpleSink.ident(f.value, undefined, /* fieldAccess */ false);

        case NodeKind.Paren:
            return simpleSink.paren(compileAST(gensym, scope, f.value));

        case NodeKind.Fun:
            const children = f.children;
            assert(children.length > 0);
            const name = `$args${gensym()}`;
            const freshScope = { ...scope };
            for (let i = 0; i < children.length - 1; i += 1) {
                const ident = children[i];
                if (ident.kind === NodeKind.Ident) {
                    freshScope[ident.value] = `${name}[${i}]`;
                    continue;
                }
                return assertNever(ident as never, "FUN arg should be ident");
            }
            const body = compileAST(gensym, freshScope, children[children.length - 1]);
            // TODO: Pass in an actual arity error.
            return `function(trace, host, ${name}){return ${name}.length>=${children.length - 1}?${body}:"#ARITY!";}`;

        case NodeKind.App:
            const head = compileAST(gensym, scope, f.children[0]);
            const args = f.children.slice(1).map(child => compileAST(gensym, scope, child));
            return simpleSink.app(head, args);

        case NodeKind.Conditional:
            return outputConditional(f.children.map(child => compileAST(gensym, scope, child)));

        case NodeKind.Dot:
            if (f.operand2.kind === NodeKind.Ident) {
                return simpleSink.dot(compileAST(gensym, scope, f.operand1), f.operand2.value);
            }
            return assertNever(f.operand2.kind as never, "DOT field should be ident");

        case NodeKind.BinaryOp:
            return simpleSink.binOp(
                f.op,
                compileAST(gensym, scope, f.operand1),
                compileAST(gensym, scope, f.operand2)
            );

        case NodeKind.UnaryOp:
            return simpleSink.unaryOp(f.op, compileAST(gensym, scope, f.operand1));

        default:
            return assertNever(f as never, "Missing should not be compiled");
    }
}

type RawFormula = <O>(trace: Trace, host: O, context: CalcValue<O>, ops: OpContext, ef: LiftedCore) => Delayed<CalcValue<O>>;

const parse = createParser(simpleSink, errorHandler);

const formula = (raw: RawFormula): Formula => <O>(host: O, context: CalcValue<O>) => {
    const [data, trace] = makeTracer();
    const result = raw(trace, host, context, ops, ef);
    return [data, result];
};

const quickCompile = (text: string) => {
    const [errors, parsed] = parse(text);
    if (errors) {
        return undefined;
    }
    return formula(new Function("trace", "host", "context", "ops", "ef", `return ${parsed};`) as RawFormula);
};

const astCompile = (text: string) => {
    const [errors, ast] = parseFormula(text);
    if (errors) {
        return undefined;
    }
    const parsed = compileAST(makeGensym(), {}, ast);
    return formula(new Function("trace", "host", "context", "ops", "ef", `return ${parsed};`) as RawFormula);
};

export const compile = (text: string) => {
    try {
        return quickCompile(text);
    }
    catch (e) {
        if (e === needsASTCompilation) {
            return astCompile(text);
        }
        return assertNever(e as never, "Unexpected error.");
    }
};
