/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeNode, ITreeConsumer, ITreeReader, ITreeProducer } from "@tiny-calc/types";
import { BottomUpTree } from "./bottomuptree";

export type BinOp = (left: number, right: number) => number;
export type Expr = BinOp | number;

export const add = (left: number, right: number): number => left + right;

function isBinOp(expr: Expr): expr is BinOp {
    return typeof(expr) !== "number";
}

export class EvalTree extends BottomUpTree<Expr, number> implements ITreeConsumer {
    private evalCounter = 0;

    public constructor (exprTree: ITreeProducer<Expr>) {
        super(exprTree);
    }

    public evalNode(node: TreeNode, input: ITreeReader<Expr>, descendants: ITreeReader<number>): number {
        this.evalCounter++;
        
        const expr = input.getNode(node);
        
        return isBinOp(expr)
            ? this.applyOp(node, expr, descendants)
            : expr;
    }

    private applyOp(node: TreeNode, op: BinOp, descendants: ITreeReader<number>) {
        node = descendants.getFirstChild(node);
        let accumulator = descendants.getNode(node);
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
            node = descendants.getNextSibling(node);
            if (node === TreeNode.none) {
                break;
            }

            accumulator = op(accumulator, descendants.getNode(node));
        }

        return accumulator;
    }

    public get evalCount(): number { return this.evalCounter; }
    public resetEvalCount(): void { this.evalCounter = 0; }
}
