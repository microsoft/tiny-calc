import { IConsumer, IVectorConsumer, IMatrixConsumer, IProducer, IVectorProducer, IMatrixProducer } from "../../src/types";
import { strict as assert } from "assert";

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
    public itemsChanged(index: number, numRemoved: number, itemsInserted: ReadonlyArray<T>, producer: IVectorProducer<T>): void {
        this.log.push({ index, numRemoved, itemsInserted, producer: this.getProducerId(producer) });
    }
    // #endregion IVectorConsumer<T>
    
    // #region IMatrixConsumer<T>
    public rowsChanged(row: number, numRemoved: number, numInserted: number, producer: IMatrixProducer<T>): void {
        this.log.push({ row, numRemoved, numInserted, producer: this.getProducerId(producer) });
    }
    
    public colsChanged(col: number, numRemoved: number, numInserted: number, producer: IMatrixProducer<T>): void {
        this.log.push({ col, numRemoved, numInserted, producer: this.getProducerId(producer) });
    }
    
    public cellsChanged(row: number, col: number, numRows: number, numCols: number, values: ReadonlyArray<T>, producer: IMatrixProducer<T>): void {
        this.log.push({ row, col, numRows, numCols, values, producer: this.getProducerId(producer) });
    }
    // #endregion IMatrixConsumer<T>

    public toString() { return JSON.stringify(this.log, undefined, 2); }

    public expect(expected: {}[]) {
        assert.deepEqual(this.log, expected);
    }
}
