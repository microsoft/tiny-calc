import { Suite } from "benchmark";
import { consume } from "./util";
import { produce } from "../src/produce";
import { NullConsumer } from "../test/util";

const array = new Array<number>(10000).fill(0).map(() => Math.random());
const producer = produce(array.slice());
const consumer = new NullConsumer();
const reader = producer.openVector(undefined as any);

export const suite = new Suite("Native Array vs. IReader");
suite.add(`array`, () => { let sum = 0; for (let i = array.length - 1; i >= 0; i--) { sum += array[i]; } return consume(sum); });
suite.add(`open().read()`, () => { let sum = 0; for (let i = reader.length - 1; i >= 0; i--) { sum += producer.open(consumer).read(i) as number; }; return consume(sum); });
suite.add(`cached reader`, () => { let sum = 0; for (let i = reader.length - 1; i >= 0; i--) { sum += reader.read(i) as number; }; return consume(sum); });
