import { TorrentStatuses } from '../preload/classes/Torrent';

export default interface TorrentInfo {
    id: string;
    name: string;
    startedAt: number;
    size: number;
    status: TorrentStatuses;
    statusSince: number;
    leechers: number;
    seeders: number;
    peers: { ip: string; port: number }[];
    inputFilePath: string;
    outputFilePath: string;
    numFiles: number;
}
