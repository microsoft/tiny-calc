/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface IConsumer<T> {
    /**
     * Invoked whenever the data this object is bound to is changed.
     */
    valueChanged<U extends T, K extends keyof U>(property: K, producer: IProducer<U>): void;
}

export interface IReader<T> {
    /**
     * Return the value associated with `property`.
     * @param property - The property of the Producer to read.
     */
    get<K extends keyof T>(property: K): T[K];

    /**
     * A reference to the underlying producer that provides values for this reader.
     */
    readonly producer?: IProducer<T>;
}

export interface IWriter<T> {
    set<K extends keyof T>(property: K, value: T[K]): void;
    delete<K extends keyof T>(property: K): void;
}

/**
 * The interface for an object whose data can be bound to. We use this contract for
 * components that want to expose their data and its changes to other components.
 *
 * Any component that implements IProducer is expected to provide some registration
 * functionality and to notify consumers whenever the data they are bound to changes.
 */
export interface IProducer<T> {
    /**
     * Acquire a reader for this producer's values and implicitly subscribe the consumer
     * to value change notifications.
     * 
     * @param consumer - The consumer to be notified of value changes.
     */
    open(consumer: IConsumer<T>): IReader<T>;

    /**
     * Unsubscribe the consumer from this producer's change notifications.
     * 
     * @param consumer - The consumer to unregister from the producer.
     */
    close(consumer: IConsumer<T>): void;
}
