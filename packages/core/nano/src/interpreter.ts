import { FormulaNode, NodeKind } from "./ast";
import {
    binOps,
    BinaryOps,
    createRuntime,
    Delay,
    Delayed,
    errors,
    Errors,
    isDelayed,
    unaryOps,
    UnaryOps,
} from "./core";

import {
    CalcObj,
    CalcValue,
    Pending,
    Runtime,
} from "./types";

interface EvalContext {
    readonly errors: Errors;
    readonly binOps: BinaryOps;
    readonly unaryOps: UnaryOps;
}

function evaluate<O>(ctx: EvalContext, origin: O, rt: Runtime<Delay>, root: CalcObj<O>, formula: FormulaNode): Delayed<CalcValue<O>> {
    switch (formula.kind) {
        case NodeKind.Literal:
            return formula.value;
            
        case NodeKind.Ident:
            return rt.read(origin, root, formula.value, ctx.errors.readOnNonObject);
            
        case NodeKind.Paren:
            return evaluate(ctx, origin, rt, root, formula.value);
            
        case NodeKind.Fun:
            throw "TODO: funs";
            
        case NodeKind.App:
            const appArgs = formula.children;
            if (appArgs.length === 0) {
                return ctx.errors.functionArity;
            }
            const head = evaluate(ctx, origin, rt, root, appArgs[0]);
            const evaluatedArgs: Delayed<CalcValue<O>>[] = [];
            for (let i = 1; i < appArgs.length; i += 1) {
                evaluatedArgs.push(evaluate(ctx, origin, rt, root, appArgs[i]));
            }
            return rt.appN(origin, head, evaluatedArgs, ctx.errors.appOnNonFunction);
            
        case NodeKind.Conditional:
            const condArgs = formula.children;
            if (condArgs.length === 0) {
                return ctx.errors.functionArity;
            }
            const cond = evaluate(ctx, origin, rt, root, condArgs[0]);
            if (isDelayed(cond)) {
                return cond;
            }
            // TODO: coercion
            if (cond) {
                return condArgs[1] ? evaluate(ctx, origin, rt, root, condArgs[1]) : true;
            }
            return condArgs[2] ? evaluate(ctx, origin, rt, root, condArgs[2]) : false;
            
        case NodeKind.Dot:
            const obj = evaluate(ctx, origin, rt, root, formula.operand1);
            if (formula.operand2.kind === NodeKind.Ident) {
                return rt.read(origin, obj, formula.operand2.value, ctx.errors.readOnNonObject);
            }
            return ctx.errors.nonStringField;
            
        case NodeKind.BinaryOp:
            return rt.app2(
                origin,
                ctx.binOps[formula.op],
                evaluate(ctx, origin, rt, root, formula.operand1),
                evaluate(ctx, origin, rt, root, formula.operand2)
            );
            
        case NodeKind.UnaryOp:
            return rt.app1(
                origin,
                ctx.unaryOps[formula.op],
                evaluate(ctx, origin, rt, root, formula.operand1)
            );
            
        case NodeKind.Missing:
            throw "TODO: missing";
            
        default:
            // TODO: assert never;
            throw `Unreachable: ${JSON.stringify(formula)}`;
    }
}

export type Interpreter = <O>(origin: O, context: CalcObj<O>, formula: FormulaNode) => [Pending<unknown>[], Delayed<CalcValue<O>>];

const evalContext: EvalContext = { errors, binOps, unaryOps };

export const interpret: Interpreter = (origin, context, formula) => {
    const [data, rt] = createRuntime();
    return [data, evaluate(evalContext, origin, rt, context, formula)];
}
