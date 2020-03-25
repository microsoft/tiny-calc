const fetch = require("node-fetch");

import {
    Pending,
    TypeMap,
    TypeName,
    isDelayed,
    CalcObj,
    CalcValue,
    interpret,
    parseExpression,
    ExpressionNode,
} from "@tiny-calc/nano";

let cache: Record<string, CalcObj<unknown> | PendingPromise> = {};

interface PendingPromise extends Pending<CalcObj<unknown>> {
    promise: Promise<void>;
}

function createRefMap(getter: () => CalcValue<unknown> | Pending<CalcValue<unknown>>): TypeMap<CalcObj<unknown>, unknown> {
    return { [TypeName.Reference]: { dereference: getter } }
}

function createReadMap(read: (prop: string) => CalcValue<unknown> | Pending<CalcValue<unknown>>): TypeMap<CalcObj<unknown>, unknown> {
    return { [TypeName.Readable]: { read: (_v, p, _c) => read(p) } }
}

function createObjFromMap(map: TypeMap<CalcObj<unknown>, unknown>): CalcObj<unknown> {
    return { typeMap: () => map, serialise: () => "TODO" }
}

function createReadableFromDict(dict: Record<string, any>): CalcObj<unknown> {
    return createObjFromMap(createReadMap(prop => {
        const val = dict[prop];
        if (val === undefined) {
            return "#MISSING!";
        }
        switch (typeof val) {
            case "object": return createReadableFromDict(val);
            default: return val;
        }
    }));
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
    return createObjFromMap(createRefMap(pending));
}

const delayedCalcValue: CalcObj<unknown> = createObjFromMap(createReadMap(read));


const f = parseExpression(`Q978185.labels.en.value + ' was last modified ' + Q978185.modified + '. ' +
Q2005.labels.en.value + ' was last modified ' + Q2005.modified
`)[1];

const g = parseExpression("Q5")[1];

/**
 * Care needs to be taken when using promise loops as they have a
 * tendency to leak memory.
 */
async function runFormula(f: ExpressionNode<string>, attempts: number): Promise<CalcValue<unknown>> {
    let [pendings, value] = interpret(undefined as unknown, delayedCalcValue, f);
    while (isDelayed(value)) {
        if (attempts > 0) {
            await Promise.all(pendings.map((p: any) => p.promise));
            [pendings, value] = interpret(undefined as unknown, delayedCalcValue, f)
            attempts--;
            continue;
        }
        throw "Exhausted attempts!";
    }
    return value;
}

console.time('go');

const cb = (x: CalcValue<unknown>) => { console.timeEnd('go'); console.log(x) };
const cb2 = (x: CalcValue<unknown>) => { console.timeEnd('go2'); console.log(x) };
runFormula(f, 5)
    .then(cb).catch(cb)
    .then(() => setTimeout(() => { return console.time('go2'), runFormula(g, 5).then(cb2).catch(cb2) }, 5000));





