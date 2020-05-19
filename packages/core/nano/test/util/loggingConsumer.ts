import { IConsumer, IVectorConsumer, IMatrixConsumer, IProducer, IVectorProducer, IMatrixProducer } from "../../src/types";
import { strict as assert } from "assert";

export class LoggingConsumer<T> implements IConsumer<T>, IVectorConsumer<T>, IMatrixConsumer<T> {
    public readonly log: any[] = [];

    public static setProducerId(producer: any, value: string) { producer.id = value; }
    private getProducerId(producer: any) { return producer.id || "Error: Missing call to LoggingConsumer.setProducerId(..)"; }

    // #region IConsumer<T>
    public valueChanged<U extends T, K extends keyof U>(property: K, producer: IProducer<U>): void {
        this.log.push({ property, producer: this.getProducerId(producer) });
    }
    // #endregion IConsumer<T>
    
    // #region IVectorConsumer<T>
    public itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorProducer<T>): void {
        this.log.push({ start, removedCount, insertedCount, producer: this.getProducerId(producer) });
    }
    // #endregion IVectorConsumer<T>
    
    // #region IMatrixConsumer<T>
    public rowsChanged(rowStart: number, removedCount: number, insertedCount: number, producer: IMatrixProducer<T>): void {
        this.log.push({ rowStart, removedCount, insertedCount, producer: this.getProducerId(producer) });
    }
    
    public colsChanged(colStart: number, removedCount: number, insertedCount: number, producer: IMatrixProducer<T>): void {
        this.log.push({ colStart, removedCount, insertedCount, producer: this.getProducerId(producer) });
    }
    
    public cellsChanged(rowStart: number, colStart: number, rowCount: number, colCount: number, producer: IMatrixProducer<T>): void {
        this.log.push({ rowStart, colStart, rowCount, colCount, producer: this.getProducerId(producer) });
    }
    // #endregion IMatrixConsumer<T>

    public toString() { return JSON.stringify(this.log, undefined, 2); }

    public expect(expected: {}[]) {
        assert.deepEqual(this.log, expected);
    }
}
