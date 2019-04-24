import * as React from "react";
import { FormulaField, LinkedNumber, LinkedSlider } from "./linked";
import * as types from "../types";
import { LinkedValue } from "../linked";

class Context implements types.Producer {
    constructor(private fields: Record<string, types.Producer>) { }

    unsubscribe(origin: types.Consumer) { }

    isProperty(property: string) {
        return property in this.fields;
    }

    request<R>(origin: types.Consumer, property: string, cont: (v: types.CalcValue) => R, err: () => R) {
        if (this.isProperty(property)) {
            return cont(this.fields[property]);
        }
        return err();
    }
}

const context = { Gravity: new LinkedValue('gravity', 10) };
const producer = new Context(context);

export class App extends React.Component<any, any> {
    render() {
        return (<div>
            <LinkedNumber value={context.Gravity} />
            <LinkedSlider value={context.Gravity} />
            <FormulaField context={producer} initial={"Gravity + 1"} />
            <FormulaField context={producer} initial={"Gravity + 2"} />
            <FormulaField context={producer} initial={"Gravity + 3"} />
            <FormulaField context={producer} initial={"Gravity + 4"} />
            <FormulaField context={producer} initial={"Gravity * 1"} />
            <FormulaField context={producer} initial={"Gravity * 2"} />
            <FormulaField context={producer} initial={"Gravity * 3"} />
            <FormulaField context={producer} initial={"Gravity * 4"} />
            <FormulaField context={producer} initial={"Gravity - 1"} />
            <FormulaField context={producer} initial={"Gravity - 2"} />
            <FormulaField context={producer} initial={"Gravity - 3"} />
            <FormulaField context={producer} initial={"Gravity - 4"} />
            <FormulaField context={producer} initial={"Gravity / 1"} />
            <FormulaField context={producer} initial={"Gravity / 2"} />
            <FormulaField context={producer} initial={"Gravity / 3"} />
            <FormulaField context={producer} initial={"Gravity / 4"} />
            <FormulaField context={producer} initial={"Gravity = 1"} />
            <FormulaField context={producer} initial={"Gravity = 2"} />
            <FormulaField context={producer} initial={"Gravity = 3"} />
            <FormulaField context={producer} initial={"Gravity = 4"} />
            <FormulaField context={producer} initial={"Gravity < 1"} />
            <FormulaField context={producer} initial={"Gravity < 2"} />
            <FormulaField context={producer} initial={"Gravity < 3"} />
            <FormulaField context={producer} initial={"Gravity < 4"} />
            <FormulaField context={producer} initial={"Gravity > 1"} />
            <FormulaField context={producer} initial={"Gravity > 2"} />
            <FormulaField context={producer} initial={"Gravity > 3"} />
            <FormulaField context={producer} initial={"Gravity > 4"} />
            <FormulaField context={producer} initial={"Gravity <> 1"} />
            <FormulaField context={producer} initial={"Gravity <> 2"} />
            <FormulaField context={producer} initial={"Gravity <> 3"} />
            <FormulaField context={producer} initial={"Gravity <> 4"} />
        </div>)
    }
}
