const { run } = require("hotloop");

run([
    { "path": "./bench/bench-js.js" },
    { "path": "./bench/bench-wasm.js" },
]);
