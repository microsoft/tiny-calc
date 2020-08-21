import { strict as assert } from "assert";
import { ExpAlgebra } from "@tiny-calc/nano";
import { TreeNode, ITreeWriter, ITreeConsumer, ITreeReader, ITreeProducer } from "../src/types";
import { TreeShape } from "../src/treeshape";
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

export const parse = (expr: string) => {
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

export class EvalTree extends BottomUpTree<ExprData> implements ITreeConsumer {
    private readonly reader: ITreeReader<ExprData>;
    private readonly results: ExprData[] = [];

    constructor (exprTree: ITreeProducer<ExprData>) {
        super();

        this.reader = exprTree.openTree(this);
    }

    protected get shape() { return this.reader; }

    // #region ITreeConsumer

    nodeChanged(node: TreeNode): void {
        this.invalidate(node);
    }

    // #endregion ITreeConsumer

    getNode(node: TreeNode): ExprData {
        if (this.isDirty(node)) {
            const result = this.results[node] = this.evalNode(node);
            this.clearDirty(node);            
            return result;
        } else {
            return this.results[node];
        }
    }

    private static readonly binOpTable: ((left: any, right: any) => any)[] = ((o) => {
        const keyToInt = new Map<string, number>(
            Object.keys(o)
                .map((str) => [str, parseInt(str)])
        );
        const max = Math.max(...keyToInt.values());
        const jumpTable = new Array(max).fill(undefined);
        
        for (const [str, i32] of keyToInt.entries()) {
            jumpTable[i32] = (o as any)[str];
        }

        return jumpTable;
    })({
        [SyntaxKind.PlusToken]: (left: any, right: any) => left + right,
        [SyntaxKind.MinusToken]: (left: any, right: any) => left - right,
        [SyntaxKind.AsteriskToken]: (left: any, right: any) => left * right,
        [SyntaxKind.SlashToken]: (left: any, right: any) => left / right,
    });

    private evalNode(node: TreeNode): ExprData {
        const expr = this.reader.getNode(node);
        if (expr === undefined) {
            return { kind: "lit", value: "" };
        }

        switch (expr.kind) {
            case "lit":
                return expr;

            case "binop": {
                const leftChild = this.getFirstChild(node);
                const leftExpr = this.getNode(leftChild);

                const rightChild = this.getNextSibling(leftChild);
                const rightExpr = this.getNode(rightChild);

                if (leftExpr.kind === "lit" && rightExpr.kind === "lit") {
                    const opFn = EvalTree.binOpTable[expr.op];
                    return { kind: "lit", value: opFn(leftExpr.value, rightExpr.value) }
                } else {
                    return expr;
                }
            }

            default:
                assert.fail();
        }
    }
}


it("works", () => {
    const tokenTree = parse("1 + 1");
    const e = new EvalTree(tokenTree);
    console.log(e.getNode(e.getFirstChild(TreeNode.root)));
});
