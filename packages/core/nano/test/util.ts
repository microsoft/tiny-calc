import { IConsumer, IVectorConsumer, IProducer, IVectorProducer } from "../src/types";

class NullConsumer<T> implements IConsumer<T>, IVectorConsumer<T> {
    public valueChanged<U extends T, K extends keyof U>(key: K, value: U[K], producer: IProducer<U>): void {}
    public itemsChanged(index: number, numRemoved: number, itemInserted: T[], producer: IVectorProducer<T>): void {}
}

/** A generic test consumer that ignores all change notifications. */
export const nullConsumer: IConsumer<unknown> & IVectorConsumer<unknown> = new NullConsumer<unknown>();
