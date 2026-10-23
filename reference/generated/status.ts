export interface Status {
    blockbook: Blockbook;
    backend:   Backend;
}

export interface Backend {
    chain:           string;
    blocks:          number;
    headers:         number;
    bestBlockHash:   string;
    difficulty:      string;
    sizeOnDisk:      number;
    version:         string;
    subversion:      string;
    protocolVersion: string;
}

export interface Blockbook {
    coin:            string;
    network:         string;
    host:            string;
    version:         string;
    gitCommit:       string;
    buildTime:       Date;
    syncMode:        boolean;
    initialSync:     boolean;
    inSync:          boolean;
    bestHeight:      number;
    lastBlockTime:   Date;
    inSyncMempool:   boolean;
    lastMempoolTime: Date;
    mempoolSize:     number;
    decimals:        number;
    dbSize:          number;
    about:           string;
}
