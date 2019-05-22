import { ListFormula, context } from "./types";

/**
 * Without a memo-producer this formula may return false.
 */
const listFormula = new ListFormula(context, "IF(Time.Now = Time.Now, Math.Max(Time.Now,Time.Now) = Math.Min(Time.Now,Time.Now), 'not ' + 'ok')", v => {
    const invariant = v.every(x => x === true);
    console.log(`value = ${JSON.stringify(v[0])}; uniform = ${invariant}`);
});

setInterval(() => listFormula.notify(), 100);
