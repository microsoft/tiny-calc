export interface Pending<T> {
  kind: "Pending";
  estimate?: T;
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
   * Unsubscribes a consumer from this producer.
   * @param consumer - The consumer to unregister from the Producer.
   */
  removeConsumer(consumer: IConsumer<T>): void;

  /**
   * Returns a reader for this producer's values and implicitly subscribes the given
   * consumer to change notifications from this producer (if it isn't already).
   * 
   * @param consumer - The object to be notified of value changes.
   */
  open(consumer: IConsumer<T>): {
    /**
     * Return the value associated with `property`.
     * @param property - The property of the Producer to read.
     */
    read<K extends keyof T>(property: K): T[K] | Pending<T[K]>;
  }
}

/**
 * The interface for an object that can bind to an IProducer.
 *
 * Any object that implements IConsumer is expected to provide a
 * callback whenever the component it is bound to changes in value and a reference
 * to the data that the consumer is bound to.
 */
export interface IConsumer<T> {
  /**
   * Invoked whenever the data this object is bound to is changed.
   */
  valueChanged<U extends T, K extends keyof U>(producer: IProducer<U>, property: K, value: U[K]): void;
}

export interface IVectorConsumer<T> {
  /** Notification that a range of items have been inserted, removed, and/or replaced in the given vector. */
  itemsChanged(producer: IVectorProducer<T>, index: number, numRemoved: number, itemInserted: T[]): void;
}

/** Provides more efficient access to 1D data for vector-aware consumers. */
export interface IVectorProducer<T> {
  /**
   * Unsubscribes a consumer from this producer.
   * @param consumer - The consumer to unregister from the Producer.
   */
  removeVectorConsumer(consumer: IConsumer<T>): void;

  openVector(consumer: IVectorConsumer<T>): {
    readonly length: T;    
    read(index: number): T;
  }
}

export interface IMatrixConsumer<T> {
  /** Notification that rows have been inserted, removed, and/or replaced in the given matrix. */
  rowsChanged(producer: IMatrixProducer<T>, row: number, numRemoved: number, rowsInserted: T[]): void;

  /** Notification that cols have been inserted, removed, and/or replaced in the given matrix. */
  colsChanged(producer: IMatrixProducer<T>, col: number, numRemoved: number, colsInserted: T[]): void;

  /** Notification that a range of cells have been replaced in the given matrix. */
  cellsReplaced(producer: IMatrixProducer<T>, row: number, col: number, numRows: number, numCols: number, values: T[]): void;
}

/** Provides more efficient access to 2D data for vector-aware consumers. */
export interface IMatrixProducer<T> {
  /**
   * Unsubscribes a consumer from this producer.
   * @param consumer - The consumer to unregister from the Producer.
   */
  removeMatrixConsumer(consumer: IMatrixConsumer<T>): void;

  openMatrix(consumer: IMatrixConsumer<T>): {
    readonly numRows: number;
    readonly numCols: number;
    read(row: number, col: number): T;
  }
}
