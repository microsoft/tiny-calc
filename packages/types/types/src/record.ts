/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/** An observable key/value collection, such as a Record or Map. */
export interface IProducer<T> {
    /**
     * Acquire a reader for this producer's values and implicitly subscribe the consumer
     * to value change notifications.
     * 
     * @param consumer - The consumer to be notified of value changes.
     */
    open(consumer: IConsumer<T>): IReader<T>;

    /**
     * Unsubscribe the given 'consumer' from this producer's change notifications.
     * 
     * @param consumer - The consumer to unregister from the producer.
     */
    close(consumer: IConsumer<T>): void;
}

/** Capability to read values of a key/value collection. */
export interface IReader<T> {
    /** Return the value associated with `property`. */
    get<K extends keyof T>(property: K): T[K];

    /**
     * A reference to the underlying producer that provides values for this reader,
     * or undefined if the producer is immutable.
     */
    readonly producer?: IProducer<T>;
}

/** Capability to set values of a key/value collection. */
export interface IWriter<T> {
    set<K extends keyof T>(property: K, value: T[K]): void;
}

/** A consumer of change notifications for a key/value collection, such as a Record or Map. */
export interface IConsumer<T> {
    /**
     * Invoked whenever the data this object is bound to is changed.
     */
    valueChanged<U extends T, K extends keyof U>(property: K, producer: IProducer<U>): void;
}
