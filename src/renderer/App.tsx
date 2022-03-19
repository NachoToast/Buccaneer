import React from 'react';
import './App.css';
import { Typography, Container } from '@mui/material';
import TopLeftLabel from './components/TopLeftLabel';
import TorrentDropper from './components/TorrentDropper';
import TorrentTable from './components/TorrentTable';

const App = () => {
    return (
        <Container>
            <TopLeftLabel />
            <TorrentDropper />
            <TorrentTable />
        </Container>
    );
};

export default App;
