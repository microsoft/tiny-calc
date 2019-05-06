import { Producer, Consumer } from "@tiny-calc/nano";

export interface TableEditConsumer {
    setColumnFormula: (column: number, formula: string) => void;
    setCell: (row: number, column: number, value: string) => void;
}

class TableEditor implements Producer<string> {
    private editConsumers: Set<TableEditConsumer> = new Set();
    private consumers: Set<Consumer<string>> = new Set();
    private lastEdit = "";
    constructor(public readonly id: string) { }

    unsubscribe(consumer: Consumer<string>) {
        this.consumers.delete(consumer);
    }

    enumerate() { }

    now<R>(property: string, cont: (value: string) => R, reject: (err?: unknown) => R): R {
        if (property === "lastEdit") {
            return cont(this.lastEdit);
        }
        return reject();
    }

    request<R>(
        origin: Consumer<string>,
        property: string,
        cont: (value: string) => R,
        reject: (err?: unknown) => R
    ): R {
        if (property === "lastEdit") {
            this.consumers.add(origin);
            return cont(this.lastEdit);
        }
        return reject();
    }

    addEditConsumer(consumer: TableEditConsumer) {
        this.editConsumers.add(consumer);
    }

    removeEditConsumer(consumer: TableEditConsumer) {
        this.editConsumers.delete(consumer);
    }

    setCell(row: number, column: number, value: string) {
        this.lastEdit = `Cell@${row}:${column} = ${value}`;
        this.editConsumers.forEach(c => c.setCell(row, column, value));
        this.consumers.forEach(c => c.updates(this, { lastEdit: this.lastEdit }))
    }

    setColumnFormula(column: number, value: string) {
        this.lastEdit = `Formula@${column} = ${value}`;
        this.editConsumers.forEach(c => c.setColumnFormula(column, value));
        this.consumers.forEach(c => c.updates(this, { lastEdit: this.lastEdit }))
    }
}

export const editor = new TableEditor("TableExampleEditor");

export const createLogger: (editor: TableEditor) => Consumer<string> = (editor) => {
    const consumer: Consumer<string> = {
        changed: () => { },
        updates: (_prod, { lastEdit: value }) => console.info(value)
    }
    // setup dependency;
    return editor.request(consumer, "lastEdit", () => consumer, () => consumer);
}
