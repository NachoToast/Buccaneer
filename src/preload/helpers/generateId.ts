import { randomBytes } from 'crypto';

let id: Buffer | null = null;

/** Generates a peer id for the client. Once generated will not change.
 *
 * @see {@link http://www.bittorrent.org/beps/bep_0020.html}
 */
function generateId(): Buffer {
    if (!id) {
        id = randomBytes(20);
        Buffer.from('-NT0000-').copy(id, 0);
    }

    return id;
}

export default generateId;
