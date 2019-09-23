import { IConsumer, IVectorConsumer, IMatrixConsumer, IProducer, IVectorProducer, IMatrixProducer } from "../../src/types";
import { strict as assert } from "assert";

class NullConsumer<T> implements IConsumer<T>, IVectorConsumer<T>, IMatrixConsumer<T> {
    public rowsChanged(): void { }
    public colsChanged(): void { }
    public cellsReplaced(): void { }
    public valueChanged(): void {}
    public itemsChanged(): void {}
}

/** A generic test consumer that ignores all change notifications. */
export const nullConsumer: IConsumer<unknown> & IVectorConsumer<unknown> & IMatrixConsumer<unknown> = new NullConsumer<unknown>();

export class LoggingConsumer<T> implements IConsumer<T>, IVectorConsumer<T>, IMatrixConsumer<T> {
    public readonly log: any[] = [];

    public static setProducerId(producer: any, value: string) { producer.id = value; }
    private getProducerId(producer: any) { return producer.id || "Error: Missing call to LoggingConsumer.setProducerId(..)"; }

    // #region IConsumer<T>
    public valueChanged<U extends T, K extends keyof U>(property: K, value: U[K], producer: IProducer<U>): void {
        this.log.push({ property, value, producer: this.getProducerId(producer) });
    }
    // #endregion IConsumer<T>
    
    // #region IVectorConsumer<T>
    public itemsChanged(index: number, numRemoved: number, itemsInserted: T[], producer: IVectorProducer<T>): void {
        this.log.push({ index, numRemoved, itemsInserted, producer: this.getProducerId(producer) });
    }
    // #endregion IVectorConsumer<T>
    
    // #region IMatrixConsumer<T>
    public rowsChanged(row: number, numRemoved: number, rowsInserted: T[], producer: IMatrixProducer<T>): void {
        this.log.push({ row, numRemoved, rowsInserted, producer: this.getProducerId(producer) });
    }
    
    public colsChanged(col: number, numRemoved: number, colsInserted: T[], producer: IMatrixProducer<T>): void {
        this.log.push({ col, numRemoved, colsInserted, producer: this.getProducerId(producer) });
    }
    
    public cellsReplaced(row: number, col: number, numRows: number, numCols: number, values: T[], producer: IMatrixProducer<T>): void {
        this.log.push({ row, col, numRows, numCols, values, producer: this.getProducerId(producer) });
    }
    // #endregion IMatrixConsumer<T>

    public toString() { return JSON.stringify(this.log, undefined, 2); }

    public expect(expected: {}[]) {
        assert.deepEqual(this.log, expected);
    }
}
