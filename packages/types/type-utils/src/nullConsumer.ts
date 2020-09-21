/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IConsumer,
    IMatrixConsumer,
    IMatrixShapeConsumer,
    IShapeConsumer,
    IVectorConsumer,
    IVectorShapeConsumer,
} from "@tiny-calc/types";

class NullConsumer implements
    IConsumer<unknown>,
    IMatrixConsumer<unknown>,
    IMatrixShapeConsumer,
    IShapeConsumer<unknown>,
    IVectorConsumer<unknown>,
    IVectorShapeConsumer
{
    public rowsChanged(): void { }
    public colsChanged(): void { }
    public cellsChanged(): void { }
    public keyChanged(): void { }
    public itemsChanged(): void { }
}

/** A generic test consumer that ignores all change notifications. */
export const nullConsumer:
    IConsumer<unknown>
        & IShapeConsumer<unknown>
        & IMatrixConsumer<unknown>
        & IMatrixShapeConsumer
        & IVectorConsumer<unknown>
        & IVectorShapeConsumer
    = new NullConsumer();
