const js = require("./int62-js").Int62;
const wasm = require("./int62-wasm").Int62;

for (const [hi30, lo32] of [
    [0, 1],
    [1, 0],
    [0x3fffffff, 0xffffffff],
]) {
    console.log(js(hi30, lo32));
    console.log(wasm(hi30, lo32));
}
