import React from 'react';
import './TopLeftLabel.css';

const TopLeftLabel = () => {
    return <div className="topLeftLabel noSelect">Buccaneer {window.api.version}</div>;
};

export default TopLeftLabel;
