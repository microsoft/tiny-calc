/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IConsumer, IVectorConsumer, IMatrixConsumer } from "@tiny-calc/types";

class NullConsumer<T> implements IConsumer<T>, IVectorConsumer<T>, IMatrixConsumer<T> {
    public rowsChanged(): void { }
    public colsChanged(): void { }
    public cellsChanged(): void { }
    public keyChanged(): void { }
    public itemsChanged(): void { }
}

/** A generic test consumer that ignores all change notifications. */
export const nullConsumer: IConsumer<unknown> & IVectorConsumer<unknown> & IMatrixConsumer<unknown> = new NullConsumer<unknown>();
