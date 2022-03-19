import TorrentTracker from './classes/TorrentTracker';

/** Handles reading of torrent files.
 *
 * @param {String[]} filePaths - List of files to process.
 */
function handleFile(filePaths: string[]): string[] {
    return filePaths.map((path) => TorrentTracker.newTorrent(path));
}

export default handleFile;
