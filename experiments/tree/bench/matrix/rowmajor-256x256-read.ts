import { RowMajorMatrix, DenseVector } from "../../src";
import { nullConsumer } from "../util";
import { sumBenchmark, fill } from ".";

const rows = new DenseVector();
const cols = new DenseVector();
const matrix = new RowMajorMatrix<number>(rows, cols);
rows.splice(/* start: */ 0, /* deleteCount: */ 0, /* insertCount: */ 256);
cols.splice(/* start: */ 0, /* deleteCount: */ 0, /* insertCount: */ 256);

fill(matrix, matrix);
sumBenchmark("RowMajor", matrix.openMatrix(nullConsumer));
