import { Suite } from "benchmark";
import { consume } from "./util";
import { produce } from "../src/produce";
import { nullConsumer } from "../test/util";

export const suites = [];

{
    const array = new Array<number>(10000).fill(0).map(() => Math.random());
    const producer = produce(array.slice());
    const reader = producer.openVector(nullConsumer);
    
    const suite = new Suite("Native Array vs. IReader");
    
    suite.add(`array`,
        () => {
            let sum = 0;
            for (let i = array.length - 1; i >= 0; i--) {
                sum += array[i];
            }
            return consume(sum);
        });
    
    suite.add(`openVector().read()`,
        () => {
            let sum = 0;
            for (let i = reader.length - 1; i >= 0; i--) {
                sum += producer.openVector(nullConsumer).read(i);
            };
            return consume(sum);
        });
    
    suite.add(`cached reader`, () => {
        let sum = 0;
        for (let i = reader.length - 1; i >= 0; i--) {
            sum += reader.read(i);
        };
        return consume(sum);
    });
    
    suites.push(suite);
}