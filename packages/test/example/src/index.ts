import { EnumerationContext } from "@tiny-calc/nano";
import { editor, createLogger } from "./tableEditor";
import { viewer } from "./tableViewer";
import { toCell, Table } from "./table";
import { simpleCompany } from "./company";


createLogger(editor);
const rows = 20;
const data: any = [];
for (let i = 0; i < rows; i++) {
    data.push([toCell(1),toCell(2),toCell(3)]);
}
const table = new Table(
    {
        company: simpleCompany,
        columnNames: {
            Person: 0,
            LikesTea: 1,
            Salary: 2            
        },
        columnFormulas: {},
        rows: data,
        caches: [],
        formulas: []
    }
);

table.view(viewer);
editor.addEditConsumer(table);

let counter = 0;

simpleCompany.enumerate(
    EnumerationContext.Properties,
    undefined as any,
    (results: string[]) => {
        if (counter >= rows) {
            return false;
        }
        results.forEach(s => {
            if (counter < rows){
                editor.setCell(counter, 0, s);
                counter++
            }
        })
        return counter < rows;
    },
    () => {}
);

editor.setColumnFormula(1, "IF(Person.likesTea, Person.email, \"NO\")");
editor.setColumnFormula(2, "Person.age * 10");

setInterval(
    () => simpleCompany.map(p => ({ ...p, likesTea: !p.likesTea })),
    1100
)

setInterval(
    () => simpleCompany.map(
        p => ({ ...p, age: Math.random() })
    ),
    2000
)

setInterval(
    () => simpleCompany.map(
        p => p.age > 0.5 ? p : ({ ...p, likesTea: false })
    ),
    3000
)

setInterval(
    () => editor.setCell(10, 0, "Chelsea"),
    1450
)

setInterval(
    () => editor.setCell(10, 0, "Curtis"),
    800
)
