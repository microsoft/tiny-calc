import {
    Primitive,
} from "@tiny-calc/nano";

export interface IMatrix<T> {
    read(row: number, col: number): T | undefined;
    write(row: number, col: number, value: T): void;
    clear(row: number, col: number): void;
}

export type Value = Primitive | undefined;
