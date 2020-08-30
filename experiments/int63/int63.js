const i32x2 = new Int32Array(2);
const f64x1 = new Float64Array(i32x2.buffer);

module.exports = {
    Int63: (hi31, lo32) => {
        i32x2[0] = lo32;

        // All non-finite numbers set the 62nd bit.  To avoid these, we move
        // the 62nd bit to the 63rd and clear the 62nd.
        i32x2[1] = (hi31 >>> 30) << 31      // Isolate bit 30 and move to position 31
                 | ((hi31 << 2) >>> 2);     // Combine with the lower bits
                 
        return f64x1[0];
    }
}
