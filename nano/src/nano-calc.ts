import { compile } from "./compiler";
import * as types from "./types";
import { TextFormula, documentContext, table1 } from "./examples";

console.time("parse and compile");
const test = compile("1 + 2 + 3 * 10");
console.timeEnd("parse and compile");

console.time("eval1");
const result = test(undefined as any, undefined as any);
console.timeEnd("eval1");

console.time("eval2");
const result2 = test(undefined as any, undefined as any);
console.timeEnd("eval2");

console.log(result);

const formula = "Table1.Profit.Length * Table1.Loss.Sum + Table1.Tax.Max";
const f1 = new TextFormula(documentContext, formula, v => {
    console.log(`${formula} = ${v}`);
});

setInterval(() => table1.addRow({ Profit: Math.random(), Loss: Math.random(), Tax: Math.random() }), 20);
