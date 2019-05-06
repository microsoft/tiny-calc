import { Producer, Consumer } from "@tiny-calc/nano";

/*
 * Revisit these types, especially the generics.
 */
export class RecordProducer<T extends Record<string, unknown>> implements Producer<T[string]> {
    id: string
    constructor(id: string, private data: T, private equal: (l: T, r: T) => boolean) {
        this.id = id;
    }

    enumerate() {}

    unsubscribe() {}

    now<R>(property: string, cont: (value: T[string]) => R, reject: (err?: unknown) => R): R {
        const value = this.data[property] as T[string];
        if (value === undefined) {
            return reject();
        }
        return cont(value);
    }

    request<R>(
        origin: Consumer<T[string]>,
        property: string,
        cont: (value: T[string]) => R,
        reject: (err?: unknown) => R
    ): R {
        return this.now(property, cont, reject);
    }

    map(fn: (x: T) => T): RecordProducer<T> {
        const newT = fn(this.data);
        return this.equal(this.data, newT) ? this : new RecordProducer(this.id, newT, this.equal);
    }
}
