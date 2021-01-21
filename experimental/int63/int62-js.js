const i32x2 = new Int32Array(2);
const f64x1 = new Float64Array(i32x2.buffer);

module.exports = {
    Int62: (hi30, lo32) => {
        i32x2[0] = lo32;
        i32x2[1] = hi30;
        return f64x1[0];
    }
}
