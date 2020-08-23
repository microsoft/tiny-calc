import { IConsumer } from "@tiny-calc/types";
import { IVectorConsumer, IMatrixConsumer } from "../../src/types";

class NullConsumer<T> implements IConsumer<T>, IVectorConsumer<T>, IMatrixConsumer<T> {
    public rowsChanged(): void { }
    public colsChanged(): void { }
    public cellsChanged(): void { }
    public valueChanged(): void { }
    public itemsChanged(): void { }
}

/** A generic test consumer that ignores all change notifications. */
export const nullConsumer: IConsumer<unknown> & IVectorConsumer<unknown> & IMatrixConsumer<unknown> = new NullConsumer<unknown>();
