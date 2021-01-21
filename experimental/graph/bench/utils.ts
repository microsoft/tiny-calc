import { Monkey } from "@tiny-calc-test/monkey";
import { JsonableObject } from "@tiny-calc/types";

interface IGraphSpec {
    seed: number;
    depth: number;
}

export function generateGraph(spec: IGraphSpec) {
    const m = new Monkey(spec.seed);
    let current: JsonableObject;
    let d = spec.depth;

    const add = (parent, child) => {
        if (Array.isArray(parent)) {
            parent.push(child);
        } else {
            parent[m.chooseString(7)] = child;
        }
    }

    if (d > 0) {
        current = m.choose([
            {
                scale: 0.5,
                action: () => {

                }
            }, {
                scale: 0.5,
                action: () => {

                }
            }
        ]);
    }
}
