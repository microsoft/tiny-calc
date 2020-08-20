import { ExpAlgebra } from "@tiny-calc/nano";
import { TreeNode, ITreeWriter } from "../src/types";
import { TreeShape } from "../src/treeshape";
import { Tree } from "../src/tree";
import { BinaryOperatorToken, UnaryOperatorToken, createBooleanErrorHandler, createParser } from "@tiny-calc/nano/dist/parser";

type ExprData =
  | { kind: "lit", value: boolean | number | string }
  | { kind: "ident", id: string }
  | { kind: "app" }
  | { kind: "dot" }
  | { kind: "binop", op: BinaryOperatorToken }
  | { kind: "unaryop", op: UnaryOperatorToken }
  | { kind: "missing" }
  | { kind: "sequence" }

function createAlgebra(writer: ITreeWriter<ExprData>, shape: TreeShape): ExpAlgebra<TreeNode> {
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
      args.forEach(arg => {
        shape.moveNode(arg, shape.lastChildOf(n));
      })
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
      expressions.forEach(arg => {
        shape.moveNode(arg, shape.lastChildOf(n));
      })
      return n;
    }
  }
}

class InputTree<T> extends Tree<T> implements ITreeWriter<T> {
  private readonly values: T[] = [];

  // #region ITreeReader

  getNode(node: TreeNode): T {
    return this.values[node];
  }

  // #endregion ITreeReader

  // #region ITreeWriter

  public setNode(node: TreeNode, value: T): void {
    this.values[node] = value;
    this.invalidateNode(node);
  }

  // #endregion ITreeWriter
}


export const parser = () => {
  const shape = new TreeShape();
  const input = new InputTree<ExprData>(shape);
  return { input, shape, parse: createParser(createAlgebra(input, shape), createBooleanErrorHandler()) };
}

function toJson(tree: InputTree<ExprData>, n: TreeNode): unknown {
  const data = tree.getNode(n);
  switch (data.kind) {
    case "lit":
      return data.value
    case "ident":
      return data.id;
    case "app":
      const head = tree.getFirstChild(n)
      let node = tree.getNextSibling(head);
      const args: unknown[] = [];
      while (node !== TreeNode.none) {
        args.push(toJson(tree, node));
        node = tree.getNextSibling(node);
      }
      return { head: toJson(tree, head), args };
      
    case "dot":
      const l = tree.getFirstChild(n)
      const r = tree.getNextSibling(l);
      return { l: toJson(tree, l), r: toJson(tree, r) }
      
    case "binop":
      const lOp = tree.getFirstChild(n)
      const rOp = tree.getNextSibling(lOp);
      return { l: toJson(tree, lOp), r: toJson(tree, rOp) }
      
    case "unaryop":
      const v = tree.getFirstChild(n)
      return { arg: toJson(tree, v) }
      
    case "missing":
      return "missing"
      
    case "sequence":
      let seq = tree.getFirstChild(n);
      const seqArgs: unknown[] = [];
      while (seq !== TreeNode.none) {
        seqArgs.push(toJson(tree, seq));
        node = tree.getNextSibling(seq);
      }
      return { args: seqArgs };
  }
}

const p = parser();
const res = p.parse("1 + 2 + 3 + test.foo.bar(4)");
if (!res[0]) {
  const root = res[1];
  console.log(JSON.stringify(toJson(p.input, root), undefined, 2));
}
