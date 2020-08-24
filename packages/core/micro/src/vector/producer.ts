/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IVectorProducer, IVectorReader, IVectorConsumer } from "@tiny-calc/types";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "../consumerset";

export abstract class VectorProducer<T> implements IVectorProducer<T>, IVectorReader<T> {
    private vectorConsumers?: ConsumerSet<IVectorConsumer<T>>;

    //#region IVectorProducer

    public openVector(consumer: IVectorConsumer<T>): IVectorReader<T> {
        this.vectorConsumers = addConsumer(this.vectorConsumers, consumer);
        return this;
    }

    public closeVector(consumer: IVectorConsumer<T>): void {
        this.vectorConsumers = removeConsumer(this.vectorConsumers, consumer);
    }

    //#endregion IVectorProducer

    //#region IVectorReader

    public abstract get length(): number;
    public abstract getItem(index: number): T;
    public get vectorProducer(): IVectorProducer<T> { return this; }

    //#endregion IVectorReader

    protected invalidateItems(start: number, removedCount: number, insertedCount: number): void {
        forEachConsumer(this.vectorConsumers, (consumer) => {
            consumer.itemsChanged(start, removedCount, insertedCount, /* producer: */ this);
        });
    }
}
