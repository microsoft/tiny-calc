import {
    parseFormula,
    Pending,
    IConsumer,
    IProducer,
    FormulaNode,
    interpret,
    Primitive,
    TypeMap,
    TypeName,
    CalcFun,
    CalcObj,
    CalcValue,
} from "@tiny-calc/nano";


interface Producer extends IProducer<Record<string, Value>> { }
type Value = Producer | CalcFun<unknown> | Primitive;
// type CalcRecord = Record<string, Value>;

export class Context implements Producer {
    constructor(private fields: Record<string, Value>) { }

    id = "context";

    removeConsumer() { }

    open() {
        return { read: (key: string) => this.fields[key] };
    }
}

export class TimeProducer implements Producer {
    constructor() { }

    id = "Time";

    removeConsumer() { }

    open() {
        const time = Date.now();
        const reader = { read: () => time };
        return reader;
    }
}

type FormulaHost = IConsumer<Record<string, Value>>;

function createPending(v: Pending<Value>): Pending<CalcValue<FormulaHost>> {
    if (v.estimate === undefined) {
        return { kind: "Pending" };
    }
    if (typeof v.estimate === "object") {
        return { kind: "Pending", estimate: createCalcValue(v.estimate) };
    }
    return { kind: "Pending", estimate: v.estimate }
}

function createReadMap<O>(read: (prop: string, context: O) => CalcValue<O> | Pending<CalcValue<O>>): TypeMap<CalcObj<O>, O> {
    return { [TypeName.Readable]: { read: (_v, p, c) => read(p, c) } }
}

function createObjFromMap<O>(map: TypeMap<CalcObj<O>, O>): CalcObj<O> {
    return { typeMap: () => map, serialise: () => "TODO" }
}

function createCalcValue(v: Producer) {
    const cache: Record<string, CalcValue<FormulaHost>> = {};
    const calcVal: CalcObj<FormulaHost> = createObjFromMap(createReadMap(
        (message: string, consumer: IConsumer<Record<string, Value>>) => {
            if (cache[message] !== undefined) {
                return cache[message];
            }
            const value = v.open(consumer).read(message);
            switch (typeof value) {
                case "string":
                case "number":
                case "boolean":
                case "function":
                    return cache[message] = value;
                default:
                    if ("kind" in value) {
                        return createPending(value);
                    }
                    return cache[message] = createCalcValue(value);
            }
        }));
    return calcVal;
}

export class ListFormula implements FormulaHost {
    private formulas: FormulaNode[];
    constructor(
        private scope: Producer,
        private formulaText: string,
        private withValue: (v: any[]) => void
    ) {
        this.formulas = [];
        const [errors, formula] = parseFormula(this.formulaText);
        if (!errors) {
            for (let i = 0; i < 1000000; i += 1) {
                this.formulas.push(formula);
            }
        }
    }

    valueChanged() {
        console.time("recalc");
        const scope = createCalcValue(this.scope);
        const values = [];
        for (let i = 0; i < 1000000; i += 1) {
            values.push(interpret(this, scope, this.formulas[i]));
        }
        console.timeEnd("recalc");
        // TODO: export delayed type
        this.withValue(values.map(([_, v]) => v));
    }
}

export class MathProducer implements Producer {
    static max = <O>(_t: any, _o: O, [x, y]: any[]) => y > x ? y : x;
    static min = <O>(_t: any, _o: O, [x, y]: any[]) => y < x ? y : x;

    constructor() { }

    id = "Math";

    removeConsumer() { }

    open() {
        return {
            read: (property: string) => {
                switch (property) {
                    case "Max": return MathProducer.max;
                    case "Min": return MathProducer.min;
                    default: return Math.PI; // a stupid default;
                }
            },
        };
    }
}

export const context = new Context({ Time: new TimeProducer(), Math: new MathProducer() });
