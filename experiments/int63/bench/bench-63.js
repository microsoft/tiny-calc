const { Int63 } = require("../int63")
const { benchmark } = require("hotloop")

let hi30 = (Math.random() * 0x100000000) >>> 2;
let lo32 = 0;
let sum = 0;

benchmark("Int63 (js)", () => {
    sum += Int63(hi30, lo32++);
});

console.log(sum);  // Side-effect using computed result to prevent dead code elimination
