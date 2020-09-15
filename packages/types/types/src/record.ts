/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/** An observable key/value collection, such as a Record or Map. */
export interface IShapeProducer<TKey> {
    /**
     * Acquire a reader for this producer's values and implicitly subscribe the consumer
     * to value change notifications.
     *
     * @param consumer - The consumer to be notified of value changes.
     */
    open(consumer: IShapeConsumer<TKey>): IShapeReader<TKey>;

    /**
     * Unsubscribe the given 'consumer' from this producer's change notifications.
     *
     * @param consumer - The consumer to unregister from the producer.
     */
    close(consumer: IShapeConsumer<TKey>): void;
}

/** A consumer of change notifications for a key/value collection, such as a Record or Map. */
export interface IShapeConsumer<TKey> {
    keyChanged(key: TKey, producer: IShapeProducer<TKey>): void;
}

/** Capability to read values of a key/value collection. */
export interface IShapeReader<TKey> {
    keys(): IterableIterator<TKey>;

    has(key: TKey): boolean;

    readonly size: number;

    /**
     * A reference to the underlying producer that provides the shape for this reader,
     * or undefined if the producer is immutable.
     */
    readonly producer?: IShapeProducer<TKey>;
}

export interface IShapeWriter<TKey> {
    delete(key: TKey): void;
    clear(): void;
}

/** An observable key/value collection, such as a Record or Map. */
export interface IProducer<T> {
    /**
     * Acquire a reader for this producer's values and implicitly subscribe the consumer
     * to value change notifications.
     *
     * @param consumer - The consumer to be notified of value changes.
     */
    open(consumer: IConsumer<T>): IReader<T> | (IReader<T> & IShapeReader<T>);

    /**
     * Unsubscribe the given 'consumer' from this producer's change notifications.
     *
     * @param consumer - The consumer to unregister from the producer.
     */
    close(consumer: IConsumer<T>): void;
}

/** A consumer of change notifications for a key/value collection, such as a Record or Map. */
export interface IConsumer<T> {
    keyChanged<K extends keyof T>(key: K, producer: IProducer<T>): void;
}

/** Capability to read values of a key/value collection. */
export interface IReader<T> {
    /** Return the value associated with `key`. */
    get<K extends keyof T>(key: K): T[K];

    /**
     * A reference to the underlying producer that provides values for this reader,
     * or undefined if the producer is immutable.
     */
    readonly producer?: IProducer<T> | (IProducer<T> & IShapeProducer<keyof T>);
}

/** Capability to set values of a key/value collection. */
export interface IWriter<T> {
    set<K extends keyof T>(key: K, value: T[K]): void;
}
