import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import {
    Box,
    Collapse,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import moment from 'moment';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import TorrentInfo from '../../../types/TorrentInfo';
import toHumanReadableSize from '../../helpers/toHumanReadableSize';

const TorrentRow = ({ torrent }: { torrent: TorrentInfo }) => {
    const {
        id,
        name,
        peers,
        seeders,
        leechers,
        size,
        status,
        statusSince,
        inputFilePath,
        outputFilePath,
        numFiles,
        startedAt,
    } = torrent;

    const humanSize = useMemo(() => toHumanReadableSize(size), [size]);

    const [duration, setDuration] = useState<string>(moment(statusSince).fromNow());
    const [age, setAge] = useState<string>(moment(startedAt).fromNow());

    useEffect(() => {
        const interval = setInterval(() => {
            setDuration(moment(statusSince).fromNow());
            setAge(moment(startedAt).fromNow());
        }, 1000);

        return () => clearInterval(interval);
    }, [startedAt, statusSince]);

    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <React.Fragment>
            <TableRow>
                <TableCell>
                    <IconButton onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Stack direction="column">
                        <span>{name}</span>
                        <span style={{ color: 'gray' }}>{status}</span>
                    </Stack>
                </TableCell>
                <TableCell align="right" title={`${size} Bytes`}>
                    {humanSize.amount} {humanSize.unit}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={3}>
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 1 }}>
                            <Typography>Extended Info:</Typography>
                            <Table size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell component="th">ID</TableCell>
                                        <TableCell>{id}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Peers</TableCell>
                                        <TableCell>{peers.length}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Seeders</TableCell>
                                        <TableCell>{seeders}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Leechers</TableCell>
                                        <TableCell>{leechers}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Last Status Change</TableCell>
                                        <TableCell>{duration}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Input File</TableCell>
                                        <TableCell>{inputFilePath}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Output File</TableCell>
                                        <TableCell>{outputFilePath}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">File Count</TableCell>
                                        <TableCell>{numFiles}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell component="th">Started</TableCell>
                                        <TableCell>{age}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

const TorrentTable = () => {
    const [torrents, setTorrents] = useState<Record<string, TorrentInfo>>({});

    const handleTorrentUpdate = useCallback(() => {
        const newTorrents = window.api.getAllTorrents();
        setTorrents(newTorrents);
    }, []);

    useEffect(() => {
        window.api.bind('torrentUpdate', handleTorrentUpdate);

        return () => window.api.unbind('torrentUpdate');
    }, [handleTorrentUpdate, torrents]);

    return (
        <div>
            <Typography variant="h5">{torrents.length} Torrents</Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Size</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.values(torrents).map((e) => (
                            <TorrentRow key={e.id} torrent={e} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default TorrentTable;
