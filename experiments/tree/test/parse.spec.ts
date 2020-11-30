/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { strict as assert } from "assert";
import { ExpAlgebra } from "@tiny-calc/nano";
import { TreeNode, ITreeWriter, ITreeConsumer, ITreeReader, ITreeProducer, TreeShape } from "../src";
import {
    BinaryOperatorToken,
    UnaryOperatorToken,
    createBooleanErrorHandler,
    createParser,
    SyntaxKind,
} from "@tiny-calc/nano/dist/parser";
import { InputTree } from "./inputtree";
import { BottomUpTree } from "./bottomuptree";

type ExprData =
    | { kind: "lit"; value: boolean | number | string }
    | { kind: "ident"; id: string }
    | { kind: "app" }
    | { kind: "dot" }
    | { kind: "binop"; op: BinaryOperatorToken }
    | { kind: "unaryop"; op: UnaryOperatorToken }
    | { kind: "missing" }
    | { kind: "sequence" };

function createAlgebra(
    writer: ITreeWriter<ExprData>,
    shape: TreeShape
): ExpAlgebra<TreeNode> {
    return {
        lit: (value: boolean | number | string) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "lit", value });
            return n;
        },
        ident: (id: string) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "ident", id });
            return n;
        },
        paren: (n: TreeNode) => {
            return n;
        },
        app: (head: TreeNode, args: TreeNode[]) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "app" });
            shape.moveNode(head, shape.lastChildOf(n));
            args.forEach((arg) => {
                shape.moveNode(arg, shape.lastChildOf(n));
            });
            return n;
        },
        dot: (left: TreeNode, right: TreeNode) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "dot" });
            shape.moveNode(left, shape.lastChildOf(n));
            shape.moveNode(right, shape.lastChildOf(n));
            return n;
        },
        binOp: (op: BinaryOperatorToken, left: TreeNode, right: TreeNode) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "binop", op });
            shape.moveNode(left, shape.lastChildOf(n));
            shape.moveNode(right, shape.lastChildOf(n));
            return n;
        },
        unaryOp: (op: UnaryOperatorToken, expr: TreeNode) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "unaryop", op });
            shape.moveNode(expr, shape.lastChildOf(n));
            return n;
        },
        missing: () => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "missing" });
            return n;
        },
        sequence: (expressions: TreeNode[]) => {
            const n = shape.createNode();
            writer.setNode(n, { kind: "sequence" });
            expressions.forEach((arg) => {
                shape.moveNode(arg, shape.lastChildOf(n));
            });
            return n;
        },
    };
}

export const parse = (expr: string): ITreeProducer<ExprData> => {
    const shape = new TreeShape();
    const tokenTree = new InputTree<ExprData>(shape);
    const [failed, root] = createParser(
        createAlgebra(tokenTree, shape),
        createBooleanErrorHandler()
    )(expr);

    if (!failed) {
        shape.moveNode(root, shape.firstChildOf(TreeNode.root));
    }

    return tokenTree;
};

export class EvalTree extends BottomUpTree<ExprData, ExprData> implements ITreeConsumer {
    private static readonly unaryOpTable = {
        [SyntaxKind.PlusToken]: (child: any) => +child,
        [SyntaxKind.MinusToken]: (child: any) => -child,
    };

    private static readonly binOpTable = {
        [SyntaxKind.PlusToken]: (left: any, right: any) => left + right,
        [SyntaxKind.MinusToken]: (left: any, right: any) => left - right,
        [SyntaxKind.AsteriskToken]: (left: any, right: any) => left * right,
        [SyntaxKind.SlashToken]: (left: any, right: any) => left / right,
        [SyntaxKind.CaretToken]: (left: any, right: any) => left ** right,
        [SyntaxKind.EqualsToken]: (left: any, right: any) => left === right,
        [SyntaxKind.LessThanToken]: (left: any, right: any) => left < right,
        [SyntaxKind.GreaterThanToken]: (left: any, right: any) => left > right,
        [SyntaxKind.LessThanEqualsToken]: (left: any, right: any) => left <= right,
        [SyntaxKind.GreaterThanEqualsToken]: (left: any, right: any) => left >= right,
        [SyntaxKind.NotEqualsToken]: (left: any, right: any) => left !== right,
    };

    public constructor (exprTree: ITreeProducer<ExprData>) {
        super(exprTree);
    }

    protected evalNode(node: TreeNode, input: ITreeReader<ExprData>, descendants: ITreeReader<ExprData>): ExprData {
        const expr = input.getNode(node);
        if (expr === undefined) {
            return { kind: "lit", value: "" };
        }

        switch (expr.kind) {
            case "lit":
                return expr;

            case "unaryop": {
                const child = descendants.getFirstChild(node);
                const childExpr = descendants.getNode(child);

                if (childExpr.kind === "lit") {
                    const opFn = EvalTree.unaryOpTable[expr.op];
                    return { kind: "lit", value: opFn(childExpr.value) }
                } else {
                    return expr;
                }
            }

            case "binop": {
                const leftChild = descendants.getFirstChild(node);
                const leftExpr = descendants.getNode(leftChild);

                const rightChild = descendants.getNextSibling(leftChild);
                const rightExpr = descendants.getNode(rightChild);

                if (leftExpr.kind === "lit" && rightExpr.kind === "lit") {
                    const opFn = EvalTree.binOpTable[expr.op];
                    return { kind: "lit", value: opFn(leftExpr.value, rightExpr.value) }
                } else {
                    return expr;
                }
            }

            default:
                throw new Error(`Unrecognized kind: ${JSON.stringify(expr)}`);
        }
    }
}

describe("Parse/EvalTree", () => {
    for (const expr of [
        "0",
        "-1",
        "+1",
        "1 + 2",
        "1 - 2",
        "1 * 2",
        "1 / 2",
        "1 < 2",
        "1 <= 2",
        "1 > 2",
        "1 >= 2",
        "(1 + 2) * 3",
    ]) {
        // eslint-disable-next-line no-eval
        const expected = eval(expr);
        it(`${expr} -> ${expected}`, () => {
            const tokenTree = parse(expr);
            const evalTree = new EvalTree(tokenTree);
            const result = evalTree.getNode(evalTree.getFirstChild(TreeNode.root));

            if (result.kind !== "lit") {
                assert.fail(`Expected literal expression, but got '${result}'`);
            } else {
                assert.equal(result.value, expected);
            }
        });
    }
});
