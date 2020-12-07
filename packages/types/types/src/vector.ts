/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/** An observable 1D numerically indexed collection, such as an Array. */
export interface IVectorShapeProducer {
    /**
     * Acquire a reader for this vector's values and implicitly subscribe the consumer
     * to value change notifications.
     *
     * @param consumer - The consumer to be notified of vector changes.
     */
    openVector(consumer: IVectorShapeConsumer): IVectorShapeReader;

    /**
     * Unsubscribe the given 'consumer' from this vector's change notifications.
     *
     * @param consumer - The consumer to unregister from the vector.
     */
    closeVector(consumer: IVectorShapeConsumer): void;
}

/** Capability to read items in a vector. */
export interface IVectorShapeReader {
    readonly length: number;

    /**
     * A reference to the underlying producer that provides values for this reader,
     * or undefined if the producer is immutable.
     */
    readonly vectorProducer?: IVectorShapeProducer;
}

/**
 * Capability to adjust the vector's length by inserting and/or removing items.  Use
 * 'IVectorWriter' to assign values to the inserted items.  (The initial value of newly
 * inserted items is implementation specific.)
 */
export interface IVectorShapeWriter {
    resize(start: number, deleteCount: number, insertCount: number): void;
}

export interface IVectorShapeConsumer {
    /** Notification that a range of items have been inserted, removed, and/or replaced in the given vector. */
    itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorShapeProducer): void;
}

/** An observable 1D numerically indexed collection, such as an Array. */
export interface IVectorProducer<T> extends IVectorShapeProducer {
    /**
     * Acquire a reader for this vector's values and implicitly subscribe the consumer
     * to value change notifications.
     *
     * @param consumer - The consumer to be notified of vector changes.
     */
    openVector(consumer: IVectorConsumer<T>): IVectorReader<T>;

    /**
     * Unsubscribe the given 'consumer' from this vector's change notifications.
     *
     * @param consumer - The consumer to unregister from the vector.
     */
    closeVector(consumer: IVectorConsumer<T>): void;
}

/** Capability to read items in a vector. */
export interface IVectorReader<T> extends IVectorShapeReader {
    getItem(index: number): T;

    /**
     * A reference to the underlying producer that provides values for this reader,
     * or undefined if the producer is immutable.
     */
    readonly vectorProducer?: IVectorProducer<T>;
}

/** Capability to insert, replace, and remove items in a vector. */
export interface IVectorWriter<T> {
    setItem(index: number, item: T): void;
}

/** A consumer of change notifications for a vector. */
export interface IVectorConsumer<T> extends IVectorShapeConsumer {
    /** Notification that a range of items have been inserted, removed, and/or replaced in the given vector. */
    itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorProducer<T>): void;
}
