import * as React from "react";
import { LinkedValue } from "../linked";
import { compile } from "../compiler";
import * as types from "../types";
import 'rc-slider/assets/index.css';
import Slider from 'rc-slider';

function evalFormula(origin: types.Consumer, context: types.Producer, formula: string) {
    return compile(formula)(origin, context);
}

interface FormulaProps {
    initial: string;
    context: types.Producer;
}

interface FormulaState {
    input: string;
    value: types.CalcValue | undefined;
}

export class FormulaField extends React.Component<FormulaProps, FormulaState> implements types.Consumer {
    constructor(props: FormulaProps) {
        super(props)
        this.state = {
            input: this.props.initial,
            value: evalFormula(this, this.props.context, this.props.initial)
        }
        this.handleChange = this.handleChange.bind(this)
        this.handleClick = this.handleClick.bind(this)
    }

    handleChange(e: any) {
        console.log(e);
        this.setState({ input: e.target.value });
    }

    notify() {
        this.handleClick();
    }
    
    handleClick() {
        console.log(this.state);
        this.setState({
            value: evalFormula(this, this.props.context, this.state.input)
        });
    }

    render() {
        return <div>
            <input type="text" onChange={this.handleChange} value={this.state.input}/>
            <input
                type="button"
                value="Alert the text input"
                onClick={this.handleClick}
            />
            <div>{`Value ${this.state.value !== undefined ? this.state.value : "BLANK"}`}</div>
        </div>;
    }
}

interface LinkedValueProps {
    value: LinkedValue<number>;
}

interface LinkedValueState {
    input: number;
}

export class LinkedSlider extends React.Component<LinkedValueProps, LinkedValueState> implements types.Consumer {
    constructor(props: LinkedValueProps) {
        super(props);
        this.state = {
            input: this.props.value.request(this, "value", x => x as number, () => { throw 'err'})
        }
        this.notify = this.notify.bind(this)
        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(input: any) {
        this.props.value.setValue(input);
    }
    
    notify(produer: types.Producer, property: string, value: any) {
        this.setState({input: value});
    }

    render() {
        return <div><Slider style={{ width: "500px" }} min={0} max={100} value={this.state.input} onChange={this.handleChange} /></div>;
    }
}

export class LinkedNumber extends React.Component<LinkedValueProps, LinkedValueState> implements types.Consumer {
    constructor(props: LinkedValueProps) {
        super(props)
        this.state = {
            input: this.props.value.request(this, "value", x => x as number, () => { throw 'err'})
        }
        this.notify = this.notify.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.handleClick = this.handleClick.bind(this)
    }

    handleChange(e: any) {
        this.setState({ input: e.target.value === "" ? 0 : parseInt(e.target.value) });
    }

    notify(produer: types.Producer, property: string, value: any) {
        this.setState({input: value});
    }

    handleClick() {
        this.props.value.setValue(this.state.input)
    }

    render() {
        return <div>
            <input type="text" onChange={this.handleChange} value={this.state.input} />
            <input
                type="button"
                value="SetValue"
                onClick={this.handleClick}
            />
        </div>;
    }
}
