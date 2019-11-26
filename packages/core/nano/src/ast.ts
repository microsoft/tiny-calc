import { Primitive } from "./types";

import {
    BinaryOperatorToken,
    createBooleanErrorHandler,
    createParser,
    ExpAlgebra,
    UnaryOperatorToken,
} from "./parser";

export const enum NodeKind {
    Literal,
    Ident,
    Paren,
    Fun,
    App,
    Conditional,
    Dot,
    BinaryOp,
    UnaryOp,
    Missing,
}

interface LiteralNode {
    kind: NodeKind.Literal;
    value: Primitive;
}

interface IdentNode {
    kind: NodeKind.Ident;
    value: string;
}

interface ParenNode {
    kind: NodeKind.Paren;
    value: FormulaNode;
}

interface FunNode {
    kind: NodeKind.Fun;
    children: FormulaNode[];
}

interface AppNode {
    kind: NodeKind.App;
    children: FormulaNode[];
}

interface ConditionalNode {
    kind: NodeKind.Conditional;
    children: FormulaNode[];
}

interface DotNode {
    kind: NodeKind.Dot;
    operand1: FormulaNode;
    operand2: FormulaNode;
}

interface BinaryOpNode {
    kind: NodeKind.BinaryOp;
    op: BinaryOperatorToken;
    operand1: FormulaNode;
    operand2: FormulaNode;
}

interface UnaryOpNode {
    kind: NodeKind.UnaryOp;
    op: UnaryOperatorToken;
    operand1: FormulaNode;
}

interface MissingNode {
    kind: NodeKind.Missing;
    value: undefined;
}

export type FormulaNode =
    | LiteralNode
    | IdentNode
    | ParenNode
    | FunNode
    | AppNode
    | ConditionalNode
    | DotNode
    | BinaryOpNode
    | UnaryOpNode
    | MissingNode;


// Types below are for internal constructors.

type UnaryNode =
    | NodeKind.Literal
    | NodeKind.Ident
    | NodeKind.Paren
    | NodeKind.Missing;

type BinaryNode =
    | NodeKind.UnaryOp
    | NodeKind.Dot
    | NodeKind.BinaryOp;

type NaryNode =
    | NodeKind.Fun
    | NodeKind.App
    | NodeKind.Conditional;

type NodeOfKind<K extends NodeKind> = Extract<FormulaNode, Record<"kind", K>>;
type Value<K extends UnaryNode> = NodeOfKind<K> extends { value: infer V } ? V : never;
type Op<K extends NodeKind> = NodeOfKind<K> extends { op: infer V } ? V : undefined;
type Operand2<K extends NodeKind> = NodeOfKind<K> extends { operand2: infer V } ? V : undefined;

function createUnaryNode<K extends UnaryNode>(kind: K, value: Value<K>): NodeOfKind<K> {
    return { kind, value } as any;
}

function createBinaryNode<K extends BinaryNode>(
    kind: K,
    op: Op<K>,
    operand1: FormulaNode,
    operand2: Operand2<K>
): NodeOfKind<K> {
    return { kind, op, operand1, operand2 } as any;
}

function createNaryNode<K extends NaryNode>(kind: K, children: FormulaNode[]): NodeOfKind<K> {
    return { kind, children } as any;
}

const errorHandler = createBooleanErrorHandler();

const astSink: ExpAlgebra<FormulaNode> = {
    lit(value: number | string | boolean) {
        return createUnaryNode(NodeKind.Literal, value);
    },
    ident(id) {
        return createUnaryNode(NodeKind.Ident, id);
    },
    paren(expr: FormulaNode) {
        return createUnaryNode(NodeKind.Paren, expr);
    },
    app(head: FormulaNode, args: FormulaNode[], start: number, end: number) {
        if (head.kind === NodeKind.Ident) {
            switch (head.value) {
                case "if":
                case "IF":
                    return createNaryNode(NodeKind.Conditional, args);
                case "fun":
                case "FUN":
                    if (args.length === 0) {
                        errorHandler.onError("Empty function definition", start, end);
                    }
                    let error = false;
                    for (let i = 0; i < args.length - 1; i += 1) {
                        if (args[i].kind !== NodeKind.Ident) {
                            error = true;
                            break;
                        }
                    }
                    if (error) {
                        // TODO: Better spans;
                        errorHandler.onError("Illegal function parameter node", start, end);
                    }
                    return createNaryNode(NodeKind.Fun, args);
            }
        }
        return createNaryNode(NodeKind.App, [head].concat(args));

    },
    dot(operand1: FormulaNode, operand2: FormulaNode) {
        return createBinaryNode(NodeKind.Dot, undefined, operand1, operand2);
    },
    binOp(op: BinaryOperatorToken, left: FormulaNode, right: FormulaNode) {
        return createBinaryNode(NodeKind.BinaryOp, op, left, right);
    },
    unaryOp(op: UnaryOperatorToken, expr: FormulaNode) {
        return createBinaryNode(NodeKind.UnaryOp, op, expr, undefined);
    },
    missing(position: number) {
        errorHandler.onError("missing", position, position);
        return createUnaryNode(NodeKind.Missing, undefined);
    }
};

export const parseFormula = createParser(astSink, errorHandler);
