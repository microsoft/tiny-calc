import { IVectorWriter } from "@tiny-calc/nano";
import { VectorProducer } from "./producer";

function toArray<T>(iterable?: Iterable<T>): T[] {
    return iterable === undefined
        ? []
        : Array.isArray(iterable)
            ? iterable
            : Array.from(iterable);
}

export class DenseVector<T> extends VectorProducer<T> implements IVectorWriter<T> {
    constructor (private items: Array<T> = []) { super(); }

    public get length(): number {
        return this.items.length;
    }

    public getItem(index: number): T {
        return this.items[index];
    }

    public setItem(index: number, value: T) {
        this.items[index] = value;
        this.invalidateItems(index, /* removedCount: */ 1, /* insertedCount: */ 1);
    }

    public splice(start: number, deleteCount: number, insertCount: number, values?: Iterable<T>) {
        const inserted = toArray(values);
        inserted.length = insertCount;

        // TODO: Using the spread operator with `.splice()` can exhaust the stack (node v12 x64)
        this.items.splice(start, deleteCount, ...inserted);

        this.invalidateItems(start, deleteCount, inserted.length);
    }
}