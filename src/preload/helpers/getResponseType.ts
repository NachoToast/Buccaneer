import { ResponseTypes } from '../../types/RawTorrent';

function getResponseType(response: Buffer): ResponseTypes {
    const action = response.readUint32BE(0);
    if (action === 0) return 'connect';
    else if (action === 1) return 'announce';
    else throw new Error(`Unknown response type: ${action}`);
}

export default getResponseType;
