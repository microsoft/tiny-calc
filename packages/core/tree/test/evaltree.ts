import { Tree } from "../src/tree";
import { TreeNode, ITreeConsumer, ITreeReader } from "../src/types";
import { BottomUpTree } from "./bottomuptree";

export type BinOp = (left: number, right: number) => number;
export type Expr = BinOp | number;

export const add = (left: number, right: number) => left + right;

function isBinOp(expr: Expr): expr is BinOp {
    return typeof(expr) !== "number";
}

export class EvalTree extends BottomUpTree<number> implements ITreeConsumer {
    private readonly reader: ITreeReader<Expr>;
    private readonly results: number[] = [];
    private evalCounter = 0;

    constructor (exprTree: Tree<Expr>) {
        super(/* shape: */ exprTree);

        this.reader = exprTree.openTree(this);
    }

    // #region ITreeConsumer

    nodeChanged(node: TreeNode): void {
        this.invalidate(node);
    }

    // #endregion ITreeConsumer

    getNode(node: TreeNode): number {
        if (this.isDirty(node)) {
            const expr = this.reader.getNode(node);
            const result = this.results[node] = isBinOp(expr)
                ? this.applyOp(node, expr)
                : expr;
            
            this.evalCounter++;
            this.clearDirty(node);
            
            return result;
        } else {
            return this.results[node];
        }
    }

    private applyOp(node: TreeNode, op: BinOp) {
        node = this.getFirstChild(node);
        let accumulator = this.getNode(node);
        
        while (true) {
            node = this.getNextSibling(node);
            if (node === TreeNode.none) {
                break;
            }

            accumulator = op(accumulator, this.getNode(node));
        }

        return accumulator;
    }

    public get evalCount() { return this.evalCounter; }
    public resetEvalCount() { this.evalCounter = 0; }
}
