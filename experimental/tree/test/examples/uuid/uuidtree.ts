/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Tree,
    TreeNode,
    TreeNodeLocation,
    ITreeShapeReader,
    ITreeShapeProducer
} from "../../../src";

// Reusable buffers for reinterpret casts
const f64x2: Float64Array   = new Float64Array(2);
const u32x4: Uint32Array    = new Uint32Array(f64x2.buffer);
const u8x16: Uint8Array     = new Uint8Array(f64x2.buffer);

// Import the appropriate secure PRNG for the current node/browser environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const csprng: (buffer: Uint32Array) => Uint32Array = (process as any).browser
    ? require("./crypto-web")
    : require("./crypto-node");

/**
 * IdTree assigns a UUID (v4) value to each inserted node.  UUIDs are flat
 * packed in a number[], using exactly 16B per UUID w/no GC references.
 *
 * In this example, reading from the tree returns UUID formatted strings,
 * but there are more efficient alternatives.
 */
export class UuidTree extends Tree<string> {
    // Flattened '[Float64, Float64][]' containing the binary encoded UUIDs assigned
    // to each tree node.
    private readonly ids: number[] = [];

    protected readonly shape: ITreeShapeReader;

    public constructor (shape: ITreeShapeProducer) {
        super();

        // Acquire a tree shape reader and subscribe ourself to shape changes.
        this.shape = shape.openTree(/* consumer: */ this);

        // Note that the root node is always present (i.e., there is no shape change
        // notification for the insertion of the root).  Therefore, we assign the root
        // a UUID now.
        this.assignUuid(TreeNode.root);
    }

    // #region ITreeReader

    public getNode(node: TreeNode): string {
        // Retrieve the hi/lo QWORDs for the UUID as a pair of Float64s
        const index = node << 1;
        f64x2[0] = this.ids[index];
        f64x2[1] = this.ids[index + 1];

        // Convert to UUID string Representation:
        //
        //      +-----------+-----------+-----------------------+-------------------------------------------+-----------+
        //      | time-low  | time-mid  | time-high-and-version | clock_seq_hi_and_reserved & clock-seq-low |   node    |
        //      |    4B     |    2B     |          2B           |                       2B                  |    6B     |
        //      +-----------+-----------+-----------------------+-------------------------------------------+-----------+
        //
        // (The 'clock_seq_hi_and_reserved' and 'clock-seq-low' fields are grouped in the string output.)
        //
        // When assigning the UUID, we cleared the high bits in bytes 7 and 15 to avoid -0 and
        // non-finite numbers.  We now swizzle these bytes to positions 6 and 8 and assign them
        // the required values for 'variant' and 'version':
        //
        //      * Set the two most significant bits of the 'clock_seq_hi_and_reserved'
        //        field to '10' (bits 7..6 of byte 6) to indicate the RFC 4122 variant.
        //
        //      * Set the four most significant bits of the 'time_hi_and_version'
        //        field to the 4-bit version number '0100' (bits 7..4 of byte 8).
        //
        // (See section 4.4 of https://www.ietf.org/rfc/rfc4122.txt)

        // Perf: Last time I optimized UUID generation, it was faster to use a lookup table.
        //       Another idea to explore is to use 'toString(16)' on larger byte groups.

        const hex = (byte: number) => {
            return byte.toString(16).padStart(2, "0");
        }

        /* eslint-disable no-bitwise */
        return `${
            hex(u8x16[0])}${
            hex(u8x16[1])}${
            hex(u8x16[2])}${
            hex(u8x16[3])}-${
            hex(u8x16[4])}${
            hex(u8x16[5])}-${
            hex(u8x16[7] | 0x40)}${      // Use byte 7: set version to '0100'
            hex(u8x16[6])}-${
            hex(u8x16[15] | 0x80)}${     // Use byte 15: set variant to '10x' (RFC 4122)
            hex(u8x16[8])}-${
            hex(u8x16[9])}${
            hex(u8x16[10])}${
            hex(u8x16[11])}${
            hex(u8x16[12])}${
            hex(u8x16[13])}${
            hex(u8x16[14])}`;
        /* eslint-enable no-bitwise */
    }

    // #endregion ITreeReader

    // #region ITreeShapeConsumer

    public nodeMoved(node: TreeNode, oldLocation: TreeNodeLocation): void {
        // Assign UUIDs to newly inserted nodes.
        if (oldLocation === TreeNodeLocation.none) {
            this.assignUuid(node);
        }

        // TODO: In debug builds, it would be a good idea to clear ids for removed nodes
        //       to help catch potential use-after-free bugs.

        // Pass notification on to consumers
        super.nodeMoved(node, oldLocation);
    }

    // #endregion ITreeShapeConsumer

    private assignUuid(node: TreeNode) {
        // Get 16B from the secure PRNG.
        csprng(u32x4);

        // To ensure our binary encoding round-trips through JSON, we need to avoid -0 and non-finite
        // numbers.  We do this by ensuring bits 63 and 62 of each Float64 are zero.  This is okay to
        // do because UUIDv4 contains 6 pre-determined (i.e., not random bits):
        //
        //    * The two MSB of 'clock_seq_hi_and_reserved' are always '10'
        //    * The four MSB of 'time_hi_and_version' are always '0100'
        //
        // (See section 4.4 of https://www.ietf.org/rfc/rfc4122.txt)
        //
        // Therefore, we clear the MSB of little-endian bytes 7 and 15 for the storage format and
        // fill in the predetermined values of '10' and '0100' when converting to strings.

        // TODO: Consider support for big/bi-endian architectures?
        u32x4[1] >>>= 4;     // version
        u32x4[3] >>>= 2;     // clock_seq_hi_and_reserved

        const index = node << 1;
        this.ids[index]     = f64x2[0];
        this.ids[index + 1] = f64x2[1];
    }
}
