import { Producer, Consumer, CalcValue, Primitive } from "./types";
import { Formula, compile } from "./compiler";

let linkedId = 0;

export function freshId()  {
    const id = linkedId;
    linkedId++;
    return id;
}

export class LinkedValue<T extends Primitive> implements Producer {
    private deps: { value: Set<Consumer>; name: Set<Consumer> };
    constructor(private name: string | number, private value: T) {
        this.deps = { value: new Set<Consumer>(), name: new Set<Consumer>() };
    }

    unsubscribe(origin: Consumer) {
        this.deps.value.delete(origin);
        this.deps.name.delete(origin);
    }

    isProperty(property: string) {
        return property === "asValue" || property === "value" || property === "name";
    }

    request<R>(origin: Consumer, property: string, cont: (v: CalcValue) => R, err: () => R) {
        switch(property) {
            case "asValue":
            case "value":
                this.deps.value.add(origin);
                return cont(this.value);
            case "name":
                this.deps.name.add(origin);
                return cont(this.name);
            default:
                return err();
        }
    }

    setState(prop: "value", value: T): void;
    setState(prop: "name", value: string | number): void;
    setState(prop: "value" | "name", value: T | string | number) {
        if (value !== this[prop]){ 
            this[prop] = value as any;
            this.deps[prop].forEach(consumer => consumer.notify(this, prop, value))
        }
    }
    
    setValue(value: T) {
        this.setState("value", value);
    }

    setName(name: string | number) {
        this.setState("name", name);
    }
}
