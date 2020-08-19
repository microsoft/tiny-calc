import { run } from "hotloop";

(async () => {
    await run([
        { "path": "./sheetlet/cached-2x2.ts" },
        { "path": "./sheetlet/recalc-2x2.ts" },
    ]);

    await run([
        { "path": "./sheetlet/cached-10x10.ts" },
        { "path": "./sheetlet/recalc-10x10.ts" },
    ]);

    await run([
        { "path": "./matrix/rowmajor-256x256-read-baseline.ts" },
        { "path": "./matrix/rowmajor-256x256-read.ts" },
    ]);
})();
