import { TreeNode, ITreeConsumer, ITreeReader, ITreeProducer } from "../src/types";
import { BottomUpTree } from "./bottomuptree";

export type BinOp = (left: number, right: number) => number;
export type Expr = BinOp | number;

export const add = (left: number, right: number) => left + right;

function isBinOp(expr: Expr): expr is BinOp {
    return typeof(expr) !== "number";
}

export class EvalTree extends BottomUpTree<Expr, number> implements ITreeConsumer {
    private evalCounter = 0;

    constructor (exprTree: ITreeProducer<Expr>) {
        super(exprTree);
    }

    evalNode(node: TreeNode, input: ITreeReader<Expr>, descendants: ITreeReader<number>): number {
        this.evalCounter++;
        
        const expr = input.getNode(node);
        
        return isBinOp(expr)
            ? this.applyOp(node, expr, descendants)
            : expr;
    }

    private applyOp(node: TreeNode, op: BinOp, descendants: ITreeReader<number>) {
        node = descendants.getFirstChild(node);
        let accumulator = descendants.getNode(node);
        
        while (true) {
            node = descendants.getNextSibling(node);
            if (node === TreeNode.none) {
                break;
            }

            accumulator = op(accumulator, descendants.getNode(node));
        }

        return accumulator;
    }

    public get evalCount() { return this.evalCounter; }
    public resetEvalCount() { this.evalCounter = 0; }
}
