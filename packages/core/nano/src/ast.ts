/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Primitive } from "./types";

import {
    AlgebraContext,
    BinaryOperatorToken,
    createBooleanErrorHandler,
    createParser,
    ExpAlgebra,
    UnaryOperatorToken,
} from "./parser";

export enum NodeKind {
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
    Sequence,
}

interface LiteralNode {
    kind: NodeKind.Literal;
    value: Primitive;
}

interface IdentNode<I> {
    kind: NodeKind.Ident;
    value: I;
}

interface ParenNode<I> {
    kind: NodeKind.Paren;
    value: ExpressionNode<I>;
}

interface FunNode<I> {
    kind: NodeKind.Fun;
    children: ExpressionNode<I>[];
}

interface AppNode<I> {
    kind: NodeKind.App;
    children: ExpressionNode<I>[];
}

interface ConditionalNode<I> {
    kind: NodeKind.Conditional;
    children: ExpressionNode<I>[];
}

interface DotNode<I> {
    kind: NodeKind.Dot;
    operand1: ExpressionNode<I>;
    operand2: ExpressionNode<I>;
}

interface BinaryOpNode<I> {
    kind: NodeKind.BinaryOp;
    op: BinaryOperatorToken;
    operand1: ExpressionNode<I>;
    operand2: ExpressionNode<I>;
}

interface UnaryOpNode<I> {
    kind: NodeKind.UnaryOp;
    op: UnaryOperatorToken;
    operand1: ExpressionNode<I>;
}

interface MissingNode {
    kind: NodeKind.Missing;
    value: undefined;
}

interface SequenceNode<I> {
    kind: NodeKind.Sequence;
    children: ExpressionNode<I>[];
}

export type ExpressionNode<I> =
    | LiteralNode
    | IdentNode<I>
    | ParenNode<I>
    | FunNode<I>
    | AppNode<I>
    | ConditionalNode<I>
    | DotNode<I>
    | BinaryOpNode<I>
    | UnaryOpNode<I>
    | MissingNode
    | SequenceNode<I>;


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
    | NodeKind.Conditional
    | NodeKind.Sequence;

type NodeOfKind<K extends NodeKind, I> = Extract<ExpressionNode<I>, Record<"kind", K>>;
type Value<K extends UnaryNode, I> = NodeOfKind<K, I> extends { value: infer V } ? V : never;
type Op<K extends NodeKind, I> = NodeOfKind<K, I> extends { op: infer V } ? V : undefined;
type Operand2<K extends NodeKind, I> = NodeOfKind<K, I> extends { operand2: infer V } ? V : undefined;

function createUnaryNode<K extends UnaryNode, I>(kind: K, value: Value<K, I>): NodeOfKind<K, I> {
    return { kind, value } as any;
}

function createBinaryNode<K extends BinaryNode, I>(
    kind: K,
    op: Op<K, I>,
    operand1: ExpressionNode<I>,
    operand2: Operand2<K, I>
): NodeOfKind<K, I> {
    return { kind, op, operand1, operand2 } as any;
}

function createNaryNode<K extends NaryNode, I>(kind: K, children: ExpressionNode<I>[]): NodeOfKind<K, I> {
    return { kind, children } as any;
}

// Public Constructors

export function ident<I>(id: I): IdentNode<I> {
    return createUnaryNode(NodeKind.Ident, id);
}

export function createAlgebra<T, I>(resolve: (id: string) => I): ExpAlgebra<ExpressionNode<I>> {
    return {
        lit(value: number | string | boolean) {
            return createUnaryNode(NodeKind.Literal, value);
        },
        ident(id: string) {
            return ident(resolve(id));
        },
        paren(expr: ExpressionNode<I>) {
            return createUnaryNode(NodeKind.Paren, expr);
        },
        app(head: ExpressionNode<I>, args: ExpressionNode<I>[], start: number, end: number, context: AlgebraContext) {
            if (head.kind === NodeKind.Ident && typeof head.value === "string") {
                switch (head.value) {
                    case "if":
                    case "IF":
                        return createNaryNode(NodeKind.Conditional, args);
                    case "fun":
                    case "FUN":
                        if (args.length === 0) {
                            context.onError("Empty function definition", start, end);
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
                            context.onError("Illegal function parameter node", start, end);
                        }
                        return createNaryNode(NodeKind.Fun, args);
                }
            }
            return createNaryNode(NodeKind.App, [head].concat(args));

        },
        dot(operand1: ExpressionNode<I>, operand2: ExpressionNode<I>) {
            return createBinaryNode(NodeKind.Dot, undefined, operand1, operand2);
        },
        binOp(op: BinaryOperatorToken, left: ExpressionNode<I>, right: ExpressionNode<I>) {
            return createBinaryNode(NodeKind.BinaryOp, op, left, right);
        },
        unaryOp(op: UnaryOperatorToken, expr: ExpressionNode<I>) {
            return createBinaryNode(NodeKind.UnaryOp, op, expr, undefined);
        },
        missing(position: number, context: AlgebraContext) {
            context.onError("missing", position, position);
            return createUnaryNode(NodeKind.Missing, undefined);
        },
        sequence(args: ExpressionNode<I>[]) {
            return createNaryNode(NodeKind.Sequence, args);
        }
    }
}
const errorHandler = createBooleanErrorHandler();
export const parseExpression = createParser(createAlgebra(x => x), errorHandler);
