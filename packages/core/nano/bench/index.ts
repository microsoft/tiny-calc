import { Suite } from "benchmark";
import { runSuite, consume } from "./util";
import { compile } from "../src/compiler";

const formulas = [
    "0",
    "1 + 2 + 3 + 4 = 10 - 10 + 10",
    "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)"
];

{
    const suite = new Suite("Compilation Only");
    for (const formula of formulas) {
        suite.add(`'${formula}'`, () => { consume(compile(formula)); });
    }
    runSuite(suite);
}

{
    const suite = new Suite("Evaluation Only");
    for (const formula of formulas) {
        const compiled = compile(formula)!;
        suite.add(`'${formula}'`, () => { consume(compiled(undefined as any, undefined as any)); });
    }
    runSuite(suite);
}
