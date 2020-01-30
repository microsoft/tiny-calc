const fetch = require("node-fetch");

import {
    Pending,
    ReadableTrait,
    ReferenceTrait,
    PrimordialTrait,
    isDelayed,
    CalcObj,
    CalcValue,
    interpret,
    parseFormula,
    FormulaNode
} from "@tiny-calc/nano";

let cache: Record<string, CalcObj<unknown> | PendingPromise> = {};

interface PendingPromise extends Pending<CalcObj<unknown>> {
    promise: Promise<void>;
}

function createReadable(read: (prop: string) => Pending<CalcValue<unknown>> | CalcValue<unknown>): CalcObj<unknown> & ReadableTrait<unknown> {
    const val: CalcObj<unknown> & ReadableTrait<unknown> = {
        acquire: t => (t === PrimordialTrait.Readable ? val : undefined) as any,
        serialise: () => "TODO",
        read
    }
    return val;
}

function createRef(dereference: () => Pending<CalcValue<unknown>> | CalcValue<unknown>): CalcObj<unknown> & ReferenceTrait<unknown> {
    const val: CalcObj<unknown> & ReferenceTrait<unknown> = {
        acquire: t => (t === PrimordialTrait.Reference ? val : undefined) as any,
        serialise: () => "TODO",
        dereference
    }
    return val;
}

function createReadableFromDict(dict: Record<string, any>): CalcObj<unknown> & ReadableTrait<unknown> {
    const val: CalcObj<unknown> & ReadableTrait<unknown> = {
        acquire: t => (t === PrimordialTrait.Readable ? val : undefined) as any,
        serialise: () => "TODO",
        read: prop => {
            const val = dict[prop];
            if (val === undefined) {
                return "#MISSING!";
            }
            switch (typeof val) {
                case "object": return createReadableFromDict(val);
                default: return val;
            }
        }
    }
    return val;
}


function queryWiki(id: string): Promise<Record<string, any>> {
    const headers = { Accept: "application/json" };
    const json = fetch(`http://www.wikidata.org/entity/${id}`, { headers }).then((body: any) => body.json());
    return json.then((d: any) => d.entities[id]);
}

const read = (prop: string) => {
    const pending: () => (PendingPromise | CalcObj<unknown>) = () => {
        if (cache[prop] !== undefined) {
            return cache[prop];
        }
        const obj: PendingPromise = {
            kind: "Pending",
            promise: queryWiki(prop).then(data => {
                cache[prop] = createReadableFromDict(data);
                return;
            })
        };
        return cache[prop] = obj;
    }
    return createRef(pending);
}

const delayedCalcValue: CalcObj<unknown> = createReadable(read);


const f = parseFormula(`Q978185.labels.en.value + ' was last modified ' + Q978185.modified + '. ' +
Q2005.labels.en.value + ' was last modified ' + Q2005.modified
`)[1];

const g = parseFormula("Q5")[1];

/**
 * Care needs to be taken when using promise loops as they have a
 * tendency to leak memory.
 */
async function runFormula(f: FormulaNode, attempts: number): Promise<CalcValue<undefined>> {
    let [pendings, value] = interpret(undefined, delayedCalcValue, f);
    while (isDelayed(value)) {
        if (attempts > 0) {
            await Promise.all(pendings.map((p: any) => p.promise));
            [pendings, value] = interpret(undefined, delayedCalcValue, f)
            attempts--;
            continue;
        }
        throw "Exhausted attempts!";
    }
    return value;
}

console.time('go');

const cb = (x: CalcValue<undefined>) => { console.timeEnd('go'); console.log(x) };
const cb2 = (x: CalcValue<undefined>) => { console.timeEnd('go2'); console.log(x) };
runFormula(f, 5)
    .then(cb).catch(cb)
    .then(() => setTimeout(() => { return console.time('go2'), runFormula(g, 5).then(cb2).catch(cb2) }, 5000));





