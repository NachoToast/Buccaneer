// import { Socket } from 'net';
// import RawTorrent from '../../types/RawTorrent';
// import PieceClass from '../classes/PieceClass';
// import getPeers from '../tracker';
// import { buildHandshake, buildInterested, buildRequest, parseMessage, Piece } from './message';
// import { Peer } from './responseHelpers/parseAnnounceResponse';

// async function main(torrent: RawTorrent): Promise<void> {
//     const requested: boolean[] = [];
//     const peers = await getPeers(torrent);
//     peers.forEach((peer) => download(peer, torrent, requested));
// }

// function download(peer: Peer, torrent: RawTorrent, requested: boolean[]) {
//     const socket = new Socket();
//     socket.on('error', console.log);
//     socket.connect(peer.port, peer.ip, () => {
//         socket.write(buildHandshake(torrent));
//     });
//     const queue: number[] = [];
//     onWholeMessage(socket, (data) => {
//         messageHandler(data, socket, requested, queue);
//     });
// }

// function messageHandler(message: Buffer, socket: Socket, requested: boolean[], queue: number[]): void {
//     if (isHandshake(message)) socket.write(buildInterested());
//     else {
//         const m = parseMessage(message);

//         switch (m.id) {
//             case 0:
//                 chokeHandler();
//                 break;
//             case 1:
//                 unchokeHandler();
//                 break;
//             case 4: {
//                 if (!(m.payload instanceof Buffer)) {
//                     throw new TypeError('Expected payload to be a buffer');
//                 }
//                 haveHandler(m.payload, socket, requested);
//                 break;
//             }
//             case 5:
//                 bitfieldHandler(m.payload);
//                 break;
//             case 7:
//                 pieceHandler(m.payload, socket, requested, queue);
//                 break;
//         }
//     }
// }

// function chokeHandler(socket: Socket) {
//     socket.end();
// }

// function unchokeHandler(socket: Socket, pieces: PieceClass) {
//     throw new Error('Function not implemented.');
// }

// function haveHandler(payload: Buffer, socket: Socket, requested: boolean[], queue: number[]) {
//     const pieceIndex = payload.readUint32BE(0);
//     if (!requested[pieceIndex]) {
//         // socket.write(buildRequest(pieceIndex));
//     }
//     requested[pieceIndex] = true;

//     queue.push(pieceIndex);
//     if (queue.length === 1) {
//         requestPiece(socket, requested, queue);
//     }
// }

// function bitfieldHandler(payload: Buffer | Piece | null) {
//     throw new Error('Function not implemented.');
// }

// function pieceHandler(payload: Buffer | Piece | null, socket: Socket, requested: boolean[], queue: number[]) {
//     queue.shift();
//     requestPiece(socket, requested, queue);
// }

// function requestPiece(socket: Socket, requested: boolean[], queue: number[]) {
//     if (requested[queue[0]]) queue.shift();
//     else {
//         // this is pseudo-code, as buildRequest actually takes slightly more
//         // complex arguments
//         // socket.write(buildRequest(pieceIndex));
//     }
// }

// function isHandshake(message: Buffer): boolean {
//     return message.length === message.readUint8(0) + 49 && message.toString('utf-8', 1) === 'BitTorrent protocol';
// }

// function onWholeMessage(socket: Socket, callback: (msg: Buffer) => void) {
//     let savedBuffer = Buffer.alloc(0);
//     let handshake = true;

//     socket.on('data', (receivedBuffer) => {
//         const messageLength = () => (handshake ? savedBuffer.readUint8(0) + 49 : savedBuffer.readInt32BE(0) + 4);

//         savedBuffer = Buffer.concat([savedBuffer, receivedBuffer]);

//         while (savedBuffer.length >= 4 && savedBuffer.length >= messageLength()) {
//             callback(savedBuffer.slice(0, messageLength()));
//             handshake = false;
//         }
//     });
// }

// export default main;
