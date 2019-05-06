import { Consumer, Formula, CalcObject, CalcValue, compile } from "@tiny-calc/nano";
import { Company, Person } from "./company";
import { TableEditConsumer } from "./tableEditor";
import { TableViewer } from "./tableViewer";

const ROW = 0 as const;
const COL = 1 as const;
type Cell = [number, number]
type TableCalcObject = CalcObject<Cell>;
type TableCalcValue = CalcValue<Cell>;

enum CalcFlag {
    Calcd,
    Dirty,
    Pending,
}

export type TableCell =
    | { flag: CalcFlag.Dirty }
    | { flag: CalcFlag.Pending }
    | { flag: CalcFlag.Calcd; value: TableCalcValue };

export function toCell(value: number): TableCell {
    return { flag: CalcFlag.Calcd, value };
}

enum COLUMN_AGGREGATES {
    Sum = "Sum",
    Average = "Average",
    Count = "Count",
}

interface TableGraph {
    company: {
        pointers: Map<string, Set<string>>;
        properties: Map<string, Map<string, Set<string>>>;
    }
    cells: Map<string, Set<string>>;
    columns: Map<number, Set<number>>;
}

interface TableBinder {
    makeKey: (cell: Cell) => string;
    linkEntity: (domain: string, name: string, to: Cell) => void;
    linkEntityProp: (domain: string, key: string, property: string, to: Cell) => void;
    linkCells: (from: Cell, to: Cell) => void;
    linkColumns: (fromC: number, toC: number) => void;
    invalidateEntities: (domain: string, entities: Record<string, unknown>, pointerConsumer: (entity: string, cell: Cell) => void,  propertyConsumer: (entity: string, cell: Cell) => void) => void;
    invalidateCell: (cell: Cell, withDependents: (cell: Cell) => void) => void;
    invalidateColumn: (column: number, withDependents: (cell: number) => void) => void;
}

function createTableBinder(): TableBinder {
    const graph: TableGraph = {
        company: {
            pointers: new Map(),
            properties: new Map()
        },
        cells: new Map(),
        columns: new Map()
    };
    const makeKey = (cell: Cell) => `${cell[ROW]}:${cell[COL]}`;
    const binder: TableBinder = {
        makeKey, 
        linkEntity(domain, name, to) {
            if (domain !== "company") return;
            if (!graph.company.pointers.has(name)) {
                graph.company.pointers.set(name, new Set());
            }
            const pointerSet = graph.company.pointers.get(name)!
            pointerSet.add(makeKey(to));
        },
        linkEntityProp(domain, name, property, to) {
            if (domain !== "company") return;
            if (!graph.company.properties.has(name)) {
                graph.company.properties.set(name, new Map());
            }
            const entityMap = graph.company.properties.get(name)!
            if (!entityMap.has(property)) {
                entityMap.set(property, new Set());
            }
            entityMap.get(property)!.add(makeKey(to));
        },
        linkCells: (from, to) => {
            const key = makeKey(from);
            const value = makeKey(to);
            if (!graph.cells.has(key)) {
                graph.cells.set(key, new Set());
            }
            graph.cells.get(key)!.add(value)
        },
        linkColumns: (fromC, toC) => {
            if (!graph.columns.has(fromC)) {
                graph.columns.set(fromC, new Set());

            }
            graph.columns.get(fromC)!.add(toC);
        },
        invalidateEntities: (domain, entities, pointerConsumer, propertyConsumer) => {
            if (domain !== "company") return;
            for (const entity in entities) {
                const pointerDeps = graph.company.pointers.get(entity);
                if (pointerDeps) {
                    graph.company.pointers.delete(entity);
                    pointerDeps.forEach(dep => {
                        const [l, r] = dep.split(':');
                        pointerConsumer(entity, [parseInt(l), parseInt(r)]);
                    });
                }
                const deps = graph.company.properties.get(entity);
                if(deps) {
                    graph.company.properties.delete(entity);
                    deps.forEach(dependentSet => {
                        dependentSet.forEach(dependent => {
                            const [l, r] = dependent.split(':');
                            propertyConsumer(entity, [parseInt(l), parseInt(r)]);
                        });
                    });                
                }
            }
        },
        invalidateCell: (cell, withDependents) => {
            const key = makeKey(cell)
            const deps = graph.cells.get(key);
            if (deps) {
                graph.cells.delete(key);
                deps.forEach(dependent => {
                    const [l, r] = dependent.split(':');
                    withDependents([parseInt(l), parseInt(r)]);
                });
            }
        },
        invalidateColumn: (col, withDependents) => {
            const deps = graph.columns.get(col);
            if (deps) {
                graph.columns.delete(col);
                deps.forEach(colNumber => {
                    withDependents(colNumber);
                })
            }
        }
    }
    return binder;
}

function scheduler<A>(isQueued: (x: A) => boolean, markQueued: (x: A) => void) {
    const tasks: A[] = [];
    return {
        queue: (task: A) => {
            if(!isQueued(task)) tasks.push(task), markQueued(task);
        },
        tasks,
    }
}

function rebuilder(tasks: Cell[], mark: (cell: Cell) => void, build: (cell: Cell) => void, binder: TableBinder) {
    let stack = tasks.slice(0);
    let task: Cell | undefined;
    let counter = 0;
    while (task = stack.pop()) {
        try {
            build(task);
            binder.invalidateCell(task, cell => {
                mark(cell);
                stack.push(cell);
            });
            counter++;
        }
        catch (e) {
            if (Array.isArray(e)) {
                stack.push(task)
                stack.push(e as Cell);
                continue
            }
            throw `Error at ${task} - ${e}`
        }
    }
    console.log(`Cells calcd = ${counter}`);
}

export interface TableModel {
    company: Company;
    formulas: string[];
    columnNames: Record<string, number>;
    columnFormulas: Record<number, Formula>;
    rows: TableCell[][];
    caches: (Partial<Record<COLUMN_AGGREGATES, TableCalcValue>> | undefined)[];
}

export class Table implements TableEditConsumer, Consumer<Person> {
    private binder = createTableBinder();
    private viewers: TableViewer[] = [];

    constructor(private model: TableModel) {

    }

    dirtyCell(cell: Cell) {
        this.model.rows[cell[ROW]][cell[COL]] = { flag: CalcFlag.Dirty };
    }

    evalCell(evalContext: EvalContext, cell: Cell) {
        const content = this.model.rows[cell[ROW]][cell[COL]];
        if (content.flag === CalcFlag.Calcd) {
            return;
        }
        const formula = this.model.columnFormulas[cell[COL]];
        if (formula === undefined) {
            throw new Error("Should never evaluate a cell without a column formula");
        }
        if (content.flag === CalcFlag.Pending) {
            throw new Error("Should never call evaluateCell on a pending cell");
        }
        this.model.rows[cell[ROW]][cell[COL]] = { flag: CalcFlag.Pending };
        const value = formula(cell, new TableObject(evalContext));
        this.finishCell(cell[ROW], cell[COL], value);
    }

    finishCell(row: number, column: number, value: TableCalcValue) {
        this.model.rows[row][column] = { flag: CalcFlag.Calcd, value };
    }

    dependOnCell(origin: Cell, row: number, column: number) {
        const cell = this.model.rows[row][column];
        if (cell.flag === CalcFlag.Calcd) {
            this.binder.linkCells([row, column], origin);
            return cell;
        }
        return cell;
    }

    getEntity<R>(origin: Cell, name: string, cont: (v: TableCalcObject) => R, reject: (err: string) => R) {
        const person = this.model.company.request(this, name, x => x, () => undefined);
        if (person) {
            this.binder.linkEntity("company", name, origin);
            return cont({
                request: (origin, attribute, cont, err) => {
                    this.binder.linkEntityProp("company", name, attribute, origin);
                    return person.now(attribute, cont as any, err);
                }
            });
        }
        return reject(name);
    }

    getEvalContext() {
        const evalContext: EvalContext = {
            linkColumns: this.binder.linkColumns.bind(this),
            dependOnCell: this.dependOnCell.bind(this),
            fetchEntity: this.getEntity.bind(this),
            columnNames: this.model.columnNames,
            raw: this.model.rows,
            cache: this.model.caches
        }
        return evalContext;
    }
    
    setColumnFormula(column: number, formula: string) {
        console.time("setCol");
        const f = compile(formula);
        this.model.columnFormulas[column] = f;
        this.model.formulas[column] = formula;
        const schedule = scheduler<Cell>(
            (cell) => this.model.rows[cell[ROW]][cell[COL]].flag === CalcFlag.Dirty,
            (cell) => this.dirtyCell(cell)
        );
        // Queue the column and anything known to depend on the column.
        this.model.rows.forEach((_row, i) => schedule.queue([i, column]));
        this.binder.invalidateColumn(
            column,
            c => this.model.rows.forEach((_row, i) => schedule.queue([i,c]))
        );
        const ctx = this.getEvalContext();
        this.model.caches[column] = undefined;
        rebuilder(schedule.tasks, cell => this.dirtyCell(cell), cell => this.evalCell(ctx, cell), this.binder);
        console.timeEnd("setCol");
    }

    parseValue(row: number, column: number, value: string) {
        if (value === "true") { return true };
        if (value === "false") { return false };
        const asNumber = parseInt(value);
        if (!isNaN(asNumber)) { return asNumber };
        return this.getEntity<TableCalcValue>([row, column], value, x => x, x => x);
    }
    
    setCell(row: number, column: number, value: string) {
        console.time("setCell");
        if (this.model.columnFormulas[column] !== undefined) {
            return;
        }
        const newValue = this.parseValue(row, column, value);
        this.finishCell(row, column, newValue);
        this.model.caches[column] = undefined;
        const ctx = this.getEvalContext();
        rebuilder([[row, column]], cell => this.dirtyCell(cell), cell => this.evalCell(ctx, cell), this.binder);
        console.timeEnd("setCell");
        this.notifyViewers()
    }

    changed() { }

    updates(_source: unknown, changed: Record<string, Person>) {
        console.time("updates");
        const schedule = scheduler<Cell>(
            (cell) => this.model.columnFormulas[cell[COL]] === undefined || this.model.rows[cell[ROW]][cell[COL]].flag === CalcFlag.Dirty,
            (cell) => this.dirtyCell(cell)
        );
        const updateEntity = (entity: string, cell: Cell) => {
            if (this.model.columnFormulas[cell[COL]] === undefined) {
                const [row, column] = cell;
                const newValue = this.parseValue(row, column, entity);
                this.finishCell(row, column, newValue);
                this.model.caches[column] = undefined;
            }
            else {
                schedule.queue(cell);
            }
        }
        this.binder.invalidateEntities("company", changed, updateEntity, (_entity, cell) => schedule.queue(cell));
        const ctx = this.getEvalContext();
        rebuilder(schedule.tasks, cell => this.dirtyCell(cell), cell => this.evalCell(ctx, cell), this.binder);
        console.timeEnd("updates");
        this.notifyViewers();
    }

    valueAt(row: number, column: number): TableCell {
        return this.model.rows[row][column];
    }

    view(viewer: TableViewer) {
        this.viewers.push(viewer)
    }

    cellToString(origin: Cell, cell: TableCell) {
        switch (cell.flag) {
            case CalcFlag.Pending: return "<PENDING>";
            case CalcFlag.Dirty: return "<DIRTY>";
            default:
                const v = cell.value;
                if (typeof v === "object") {
                    return v.request(origin, "shortName", x => x as string, () => "<ERROR>");
                }
                return v.toString();
       }
    }
    
    notifyViewers() {
        const headers: string[] = []
        const formulas: string[] = []
        for (const header in this.model.columnNames) {
            const index = this.model.columnNames[header];
            const formula = this.model.formulas[index];
            headers.push(header);
            formulas.push(formula === undefined ? "" : formula)
        }
        const data = this.model.rows.map((row, i) => row.map((cell, j) => this.cellToString([i, j], cell)));
        this.viewers.forEach(v => v.update(headers, formulas, data));
    }
}

interface EvalContext {
    linkColumns: (fromC: number, toC: number) => void,
    dependOnCell: (origin: Cell, row: number, column: number) => TableCell
    fetchEntity: <R>(origin: Cell, name: string, cont: (v: TableCalcValue) => R, reject: (err?: unknown) => R) => R;
    columnNames: Record<string, number>;
    raw: TableCell[][];
    cache: (Partial<Record<COLUMN_AGGREGATES, TableCalcValue>> | undefined)[];
}

class TableObject implements TableCalcObject {
    constructor(private evalContext: EvalContext) { }

    request<R>(
        origin: Cell,
        property: string,
        cont: (v: TableCalcValue) => R,
        err: (err?: unknown) => R
    ) {
        const column = this.evalContext.columnNames[property];
        if (column !== undefined) {
            return cont(new Column(this.evalContext, origin[ROW], column));
        }
        return this.evalContext.fetchEntity(origin, property, cont, () => err());
    }
}

const asNumber = (x: TableCalcValue) => typeof x === "number" ? x : 0;
const isNumber = (x: TableCalcValue): x is number => typeof x === "number";

class Column implements TableCalcObject {
    constructor(private evalContext: EvalContext, private focusRow: number, private focusColumn: number) { }

    getAggregation<R>(
        origin: Cell,
        property: COLUMN_AGGREGATES,
        cont: (v: TableCalcValue) => R,
        err: (err?: unknown) => R
    ): R {
        // For aggregators we just add edges between columns. This is
        // an over-approximation but reduces the number of edges.
        if (this.evalContext.cache[this.focusColumn] !== undefined) {
            const cache = this.evalContext.cache[this.focusColumn]!;
            if (cache[property] !== undefined) {
                this.evalContext.linkColumns(this.focusColumn, origin[COL]);
                return cont(cache[property]!);
            }
        }
        else {
            this.evalContext.cache[this.focusColumn] = {};
        }
        let value;
        switch (property) {
            case COLUMN_AGGREGATES.Sum:
                let sum = 0;
                for (let i = 0; i < this.evalContext.raw.length; i += 1) {
                    const cell = this.evalContext.raw[i][this.focusColumn];
                    switch (cell.flag) {
                        case CalcFlag.Pending: return err("cycle");
                        case CalcFlag.Dirty: return err([this.focusRow, this.focusColumn]);
                        default:
                            sum += asNumber(cell.value);
                    }
                }
                value = sum;
                break;

            case COLUMN_AGGREGATES.Average:
                let total = 0;
                let count = 0;
                for (let i = 0; i < this.evalContext.raw.length; i += 1) {
                    const cell = this.evalContext.raw[i][this.focusColumn];
                    switch (cell.flag) {
                        case CalcFlag.Pending: return err("cycle");
                        case CalcFlag.Dirty: return err([this.focusRow, this.focusColumn]);
                        default:
                            if (isNumber(cell.value)) {
                                total += cell.value
                                count++;
                            }
                    }
                }
                value = count === 0 ? "#N/A" : total / count;
                break;

            case COLUMN_AGGREGATES.Count:
                value = this.evalContext.raw.length;
                break;

            default:
                return err();
        }
        this.evalContext.cache[this.focusColumn]![property] = value;
        this.evalContext.linkColumns(this.focusColumn, origin[COL]);
        return cont(value);
    }

    request<R>(
        origin: Cell,
        property: string,
        cont: (v: TableCalcValue) => R,
        err: (err?: unknown) => R
    ) {
        switch (property) {
            case "value":
                const cell = this.evalContext.dependOnCell(origin, this.focusRow, this.focusColumn);
                switch (cell.flag) {
                    case CalcFlag.Pending: return err("cycle");
                    case CalcFlag.Dirty: return err([this.focusRow, this.focusColumn]);
                    default: return cont(cell.value);
                }

            case COLUMN_AGGREGATES.Sum:
            case COLUMN_AGGREGATES.Count:
            case COLUMN_AGGREGATES.Average:
                return this.getAggregation(origin, property, cont, err);

            default:
                const celll = this.evalContext.dependOnCell(origin, this.focusRow, this.focusColumn);
                switch (celll.flag) {
                    case CalcFlag.Pending: return err("cycle");
                    case CalcFlag.Dirty: return err([this.focusRow, this.focusColumn]);
                    default:
                        if (typeof celll.value === "object") {
                            return celll.value.request(origin, property, cont, err)
                        }
                        return cont(celll.value);
                }
        }
    }
}
