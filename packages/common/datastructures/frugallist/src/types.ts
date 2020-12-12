/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

 /**
  * Must not store the value 'undefined' or any Array type inside a FrugalList.
  */
export type FrugalListItem<T> = Exclude<T, undefined | Array<any>>;     // eslint-disable-line @typescript-eslint/no-explicit-any

export type FrugalList<T> = undefined | FrugalListItem<T> | Array<FrugalListItem<T>>;
