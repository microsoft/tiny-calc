import { ExpressionNode, NodeKind } from "./ast";
import {
    binOps,
    BinaryOps,
    CoreRuntime,
    createObjectResolver,
    Delayed,
    errors,
    Errors,
    makeTracer,
    unaryOps,
    UnaryOps,
} from "./core";

import {
    CalcObj,
    CalcValue,
    Pending,
    Resolver,
    Runtime,
} from "./types";

export interface EvalContext {
    readonly errors: Errors;
    readonly binOps: BinaryOps;
    readonly unaryOps: UnaryOps;
}

export function evaluate<O, I, Delay>(ctx: EvalContext, origin: O, rt: Runtime<Delay>, resolver: Resolver<O, I, Delay>, expr: ExpressionNode<I>): CalcValue<O> | Delay {
    switch (expr.kind) {
        case NodeKind.Literal:
            return expr.value;

        case NodeKind.Ident:
            return resolver.resolve(origin, expr.value, ctx.errors.resolveError);

        case NodeKind.Paren:
            return evaluate(ctx, origin, rt, resolver, expr.value);

        case NodeKind.Fun:
            throw "TODO: funs";

        case NodeKind.App:
            const appArgs = expr.children;
            if (appArgs.length === 0) {
                return ctx.errors.functionArity;
            }
            const head = evaluate(ctx, origin, rt, resolver, appArgs[0]);
            const evaluatedArgs: (CalcValue<O> | Delay)[] = [];
            for (let i = 1; i < appArgs.length; i += 1) {
                evaluatedArgs.push(evaluate(ctx, origin, rt, resolver, appArgs[i]));
            }
            return rt.appN(origin, head, evaluatedArgs, ctx.errors.appOnNonFunction);

        case NodeKind.Conditional:
            const condArgs = expr.children;
            if (condArgs.length === 0) {
                return ctx.errors.functionArity;
            }
            const cond = evaluate(ctx, origin, rt, resolver, condArgs[0]);
            if (rt.isDelayed(cond)) {
                return cond;
            }
            // TODO: coercion
            if (cond) {
                return condArgs[1] ? evaluate(ctx, origin, rt, resolver, condArgs[1]) : true;
            }
            return condArgs[2] ? evaluate(ctx, origin, rt, resolver, condArgs[2]) : false;

        case NodeKind.Dot:
            const obj = evaluate(ctx, origin, rt, resolver, expr.operand1);
            if (expr.operand2.kind === NodeKind.Ident && typeof expr.operand2.value === "string") {
                return rt.read(origin, obj, expr.operand2.value, ctx.errors.readOnNonObject);
            }
            return ctx.errors.nonStringField;

        case NodeKind.BinaryOp:
            return rt.app2(
                origin,
                ctx.binOps[expr.op],
                evaluate(ctx, origin, rt, resolver, expr.operand1),
                evaluate(ctx, origin, rt, resolver, expr.operand2)
            );

        case NodeKind.UnaryOp:
            return rt.app1(
                origin,
                ctx.unaryOps[expr.op],
                evaluate(ctx, origin, rt, resolver, expr.operand1)
            );

        case NodeKind.Missing:
            throw "TODO: missing";

        default:
            // TODO: assert never;
            throw `Unreachable: ${JSON.stringify(expr)}`;
    }
}

export type Interpreter = <O>(origin: O, root: CalcObj<O>, expr: ExpressionNode<string>) => [Pending<unknown>[], Delayed<CalcValue<O>>];

export const evalContext: EvalContext = { errors, binOps, unaryOps };

export const interpret: Interpreter = (origin, root, expr) => {
    const [data, trace] = makeTracer();
    return [data, evaluate(evalContext, origin, new CoreRuntime(trace), createObjectResolver(root, trace), expr)];
}
