/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IProducer, IReader, IConsumer } from "@tiny-calc/types";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "../consumerset";

export abstract class Producer<TMap> implements IProducer<TMap>, IReader<TMap> {
    private consumers?: ConsumerSet<IConsumer<TMap>>;

    //#region IProducer

    public open(consumer: IConsumer<TMap>): IReader<TMap> {
        this.consumers = addConsumer(this.consumers, consumer);
        return this;
    }

    public close(consumer: IConsumer<TMap>): void {
        this.consumers = removeConsumer(this.consumers, consumer);
    }

    //#endregion IProducer

    //#region IReader

    public abstract get<K extends keyof TMap>(key: K): TMap[K];

    public get producer():IProducer<TMap> { return this; }

    //#endregion IReader

    protected invalidateValue<K extends keyof TMap>(key: K): void {
        forEachConsumer(this.consumers, (consumer) => {
            consumer.keyChanged(key, this);
        });
    }
}
