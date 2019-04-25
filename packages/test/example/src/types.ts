import { Formula, Producer, Consumer, CalcValue, compile } from "@tiny-calc/nano";

enum ColumnProperties {
    Sum = "Sum",
    Max = "Max",
    Min = "Min",
    Length = "Length",
    Name = "Name"
}

function initDependencyGraph() {
    return {
        [ColumnProperties.Sum]: new Set(),
        [ColumnProperties.Max]: new Set(),
        [ColumnProperties.Min]: new Set(),
        [ColumnProperties.Length]: new Set(),
        [ColumnProperties.Name]: new Set()
    };
}

class Column implements Producer {
    private dataCache: Record<Exclude<ColumnProperties, ColumnProperties.Name>, number> | undefined;
    private consumers: Record<ColumnProperties, Set<Consumer>>;
    constructor(private name: string, private data: number[]) {
        this.consumers = initDependencyGraph();
    }

    private computeCache() {
        this.dataCache = {
            [ColumnProperties.Sum]: this.data.reduce((x, y) => x + y, 0),
            [ColumnProperties.Max]: Math.max(...this.data),
            [ColumnProperties.Min]: Math.min(...this.data),
            [ColumnProperties.Length]: this.data.length
        };
    }

    private getValue(property: ColumnProperties) {
        switch (property) {
            case ColumnProperties.Name:
                return this.name;
            default:
                if (this.dataCache === undefined) {
                    this.computeCache();
                }
                return this.dataCache![property];
        }
    }

    private notifyProperty(property: ColumnProperties) {
        this.consumers[property].forEach(host => host.notify(this, property, this.getValue(property)));
    }

    private unSubscribeProperty(property: ColumnProperties, host: Consumer) {
        this.consumers[property].delete(host);
    }

    unsubscribe(origin: Consumer) {
        this.unSubscribeProperty(ColumnProperties.Sum, origin);
        this.unSubscribeProperty(ColumnProperties.Max, origin);
        this.unSubscribeProperty(ColumnProperties.Min, origin);
        this.unSubscribeProperty(ColumnProperties.Length, origin);
        this.unSubscribeProperty(ColumnProperties.Name, origin);
    }

    isProperty(prop: string): prop is ColumnProperties {
        switch (prop) {
            case ColumnProperties.Sum:
            case ColumnProperties.Max:
            case ColumnProperties.Min:
            case ColumnProperties.Length:
            case ColumnProperties.Name:
                return true;
        }
        return false;
    }

    request<R>(origin: Consumer, property: string, cont: (v: CalcValue) => R, err: () => R) {
        if (this.isProperty(property)) {
            this.consumers[property].add(origin);
            return cont(this.getValue(property));
        }
        return err();
    }

    appendValue(value: number) {
        this.data.push(value);
        this.dataCache = undefined;
        this.notifyProperty(ColumnProperties.Sum);
        this.notifyProperty(ColumnProperties.Max);
        this.notifyProperty(ColumnProperties.Min);
        this.notifyProperty(ColumnProperties.Length);
    }
}

class Table implements Producer {
    constructor(private name: string, private columns: Record<string, Column>) { }

    unsubscribe(origin: Consumer) { }

    isProperty(property: string) {
        return property in this.columns;
    }

    request<R>(origin: Consumer, property: string, cont: (v: CalcValue) => R, err: () => R) {
        if (this.isProperty(property)) {
            return cont(this.columns[property]);
        }
        return err();
    }

    addRow(row: Record<string, number>) {
        for (const col in row) {
            if (this.isProperty(col)) {
                this.columns[col].appendValue(row[col]);
            }
        }
    }
}

export class Context implements Producer {
    constructor(private fields: Record<string, Producer>) { }

    unsubscribe(origin: Consumer) { }

    isProperty(property: string) {
        return property in this.fields;
    }

    request<R>(origin: Consumer, property: string, cont: (v: CalcValue) => R, err: () => R) {
        if (this.isProperty(property)) {
            return cont(this.fields[property]);
        }
        return err();
    }
}



export class TextFormula implements Consumer {
    private formula: Formula;
    constructor(private scope: Producer, private formulaText: string, private withValue: (v: CalcValue) => void) {
        this.formula = compile(this.formulaText);
        this.withValue(this.formula(this, this.scope));
    }

    notify() {
        console.time("recalc");
        const value = this.formula(this, this.scope);
        console.timeEnd("recalc");
        this.withValue(value);
    }
}

export const table1 = new Table("Table1", {
    Profit: new Column("Profit", [1, 2, 3, 4, 5]),
    Loss: new Column("Loss", [10, 20, 30, 40, 50]),
    Tax: new Column("Tax", [100, 200, 300, 400, 500])
});

export const documentContext = new Context({ Table1: table1 });

export class ListFormula implements Consumer {
    private formulas: Formula[];
    constructor(private scope: Producer, private formulaText: string, private withValue: (v: CalcValue[]) => void) {
        this.formulas = [];
        for (let i = 0; i < 1000; i += 1) {
            this.formulas.push(compile(this.formulaText));
        }
    }

    notify() {
        console.time("recalc");
        const scope = new MemoProducer(this.scope);
        const values = this.formulas.map(fn => fn(this, scope));
        console.timeEnd("recalc");
        this.withValue(values);
    }
}

export class MemoProducer implements Producer {
    private cache: Record<string, CalcValue>;
    constructor(private readonly source: Producer) {
        this.cache = {};
    }
    unsubscribe() {}

    isProperty(property: string) {
        return this.source.isProperty(property);
    }

    request<R>(origin: Consumer, property: string, cont: (v: CalcValue) => R, err: () => R) {
        if (this.cache[property] !== undefined) {
            return cont(this.cache[property]);
        }
        return this.source.request(origin, property, v => {
            if (typeof v === "object") {
                this.cache[property] = new MemoProducer(v);
                return cont(this.cache[property]);
            }
            this.cache[property] = v;
            return cont(v);
        }, err);
    }
}

export class TimeProducer implements Producer {
    constructor() {}

    unsubscribe() {}

    isProperty(property: string) {
        return property === "Now";
    }

    request<R>(origin: Consumer, property: string, cont: (v: CalcValue) => R, err: () => R) {
        if (this.isProperty(property)) {
            return cont(Date.now());
        }
        return err();
    }
}

export const context = new Context({ Time: new TimeProducer() });
