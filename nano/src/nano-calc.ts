import { ListFormula, context } from "./examples";


// const formula = "Table1.Profit.Length * Table1.Loss.Sum + Table1.Tax.Max";
// const f1 = new TextFormula(documentContext, formula, v => {
//     console.log(`${formula} = ${v}`);
// });
// 
// setInterval(() => table1.addRow({ Profit: Math.random(), Loss: Math.random(), Tax: Math.random() }), 100);


// The list formula contains a list of duplicate formulas. We use a
// memoizing context to ensure that each evaluation of a formula is
// time invariant.

const listFormula = new ListFormula(context, "IF(Time.Now = Time.Now, 'ok', 'not ok')", v => {
    const invariant = v.every(x => x === 'ok');
    if (!invariant) {
        console.log(v);
    }
    console.log(`value = ${JSON.stringify(v[0])}; uniform = ${invariant}`);
});

setInterval(() => listFormula.notify(), 100);
