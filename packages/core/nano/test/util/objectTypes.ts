import {
    CalcValue,
    CalcObj,
    Pending,
    TypeMap,
    TypeName
} from "../../src/index";

export function createRefMap<O>(value: CalcValue<O>): TypeMap<CalcObj<O>, O> {
    return { [TypeName.Reference]: { dereference: () => value } }
}

export function createReadMap<O>(read: (prop: string, context: O) => CalcValue<O> | Pending<CalcValue<O>>): TypeMap<CalcObj<O>, O> {
    return { [TypeName.Readable]: { read: (_v, p, c) => read(p, c) } }
}

export function createObjFromMap<O>(name: string, map: TypeMap<CalcObj<O>, O>): CalcObj<O> {
    return { typeMap: () => map, serialise: () => name }
}
