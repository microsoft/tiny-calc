/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Jsonable } from "@tiny-calc/types";
import { GraphNode } from "./types";
import { Graph } from "./graph";

export class ObjectGraph extends Graph<Jsonable> {
    public ref(node: GraphNode, ...path: (string | number)[]): GraphNode {
        for (const part of path) {
            if (typeof part === "string") {
                const labels = this.getNode(node) as string[];
                let index = labels.indexOf(part);
                if (index < 0) {
                    const child = this.createNode();
                    index = labels.push(part) - 1;
                    this.spliceChildren(node, /* start: */ index, /* removeCount: */ 0, child);
                    node = child;
                }
                node = this.getChild(node, index);
            } else {
                node = this.getChild(node, part);
            }
        }

        return node;
    }

    public get(node: GraphNode, ...path: (string | number)[]): Jsonable {
        return this.read(this.ref(node, ...path));
    }

    public set(node: GraphNode, value: Jsonable, ...path: (string | number)[]): GraphNode {
        node = this.ref(node, ...path);

        if (typeof value === "object") {
            if (Array.isArray(value)) {
                this.setNode(node, undefined);

                for (let i = 0; i < value.length; i++) {
                    this.spliceChildren(node, /* start: */ i, /* removeCount: */ 0, this.set(this.createNode(), value[i]));
                }
            } else if (value === null) {
                this.setNode(node, null);
            } else {
                const keys = Object.keys(value);
                this.setNode(node, keys);

                for (let i = 0; i < keys.length; i++) {
                    this.spliceChildren(node, /* start: */ i, /* removeCount: */ 0, this.set(this.createNode(), value[keys[i]]));
                }
            }
        } else {
            this.setNode(node, value);
        }

        return node;
    }

    public from(json: Jsonable): GraphNode {
        return this.set(this.createNode(), json);
    }

    private read(node: GraphNode) {
        const value = this.getNode(node);

        if (Array.isArray(value)) {
            const properties: PropertyDescriptorMap = {};

            for (let childIndex = 0; childIndex < value.length; childIndex++) {
                properties[value[childIndex] as string] = {
                    value: this.read(this.getChild(node, childIndex)),
                    enumerable: true,
                    configurable: false,
                    writable: false,
                }
            }

            return Object.freeze(Object.defineProperties({}, properties));
        } else if (value === undefined) {
            const array = new Array(this.getChildCount(node));
            for (let childIndex = 0; childIndex < array.length; childIndex++) {
                array[childIndex] = this.read(this.getChild(node, childIndex));
            }

            return Object.freeze(array);
        } else {
            return value;
        }
    }
}
