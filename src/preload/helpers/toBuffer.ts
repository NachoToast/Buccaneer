/** Modified from the node-bigint npm package.
 *
 * @see {@link https://github.com/substack/node-bigint/blob/401ba523e4f86aafda48fa04c27ef0f67e8e65fd/index.js#L332-L394}
 */
export default function toBuffer(payload: number, size: number): Buffer {
    const endian = 'big';
    let hex = payload.toString(16);

    if (hex.charAt(0) === '-') throw new Error('Unable to convert negative numbers to buffer');

    const len = Math.ceil(hex.length / (2 * size)) * size;
    const buf = Buffer.allocUnsafe(len);

    // zero-pad the hex string so the chunks are all `size` long
    while (hex.length < 2 * len) hex = '0' + hex;

    const hx = hex.split(new RegExp('(.{' + 2 * size + '})')).filter(function (s) {
        return s.length > 0;
    });

    hx.forEach(function (chunk, i) {
        for (let j = 0; j < size; j++) {
            const ix = i * size + (endian === 'big' ? j : size - j - 1);
            buf[ix] = parseInt(chunk.slice(j * 2, j * 2 + 2), 16);
        }
    });

    return buf;
}
