const js = require("./int62-js").Int62;
const { Int63 } = require("./int63");
const assert = require("assert").strict;

const hex = (n) => `0x${n.toString(16).padStart(8, '0')}`

const patterns = [
    [0, 1],
    [1, 0],
    [0x3fffffff, 0xffffffff],
    [0x40000000, 0x00000000],
    [0x7ff00000, 0x00000000],                               // +infinity
    [0xfff00000, 0x00000000],                               // -infinity
    [0x7ff00000, 0x00000001], [0x7ff7ffff, 0xffffffff],     // qnan range 1
    [0xfff00000, 0x00000001], [0xfff7ffff, 0xffffffff],     // qnan range 2
    [0x7ff80000, 0x00000000], [0x7fffffff, 0xffffffff],     // snan range 1
    [0xfff80000, 0x00000000], [0xffffffff, 0xffffffff]      // snan range 2
];

console.log("\nInt63:")
for (const [hi31, lo32] of patterns) {
    console.log(`${hex(hi31)} ${hex(lo32)} -> ${`${Int63(hi31, lo32)}`.padEnd(20)} (reinterpret: ${js(hi31, lo32)})`);
}

// Unfortunately the Int63 scheme can produce -0, which collapses to 0 when stringified to JSON
assert.notEqual(Int63(0, 0), Int63(0x40000000, 0));