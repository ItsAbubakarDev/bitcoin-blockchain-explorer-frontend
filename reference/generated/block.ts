export interface Block {
    page:              number;
    totalPages:        number;
    itemsOnPage:       number;
    hash:              string;
    previousBlockHash: string;
    nextBlockHash:     string;
    height:            number;
    confirmations:     number;
    size:              number;
    time:              number;
    version:           number;
    merkleRoot:        string;
    nonce:             string;
    bits:              string;
    difficulty:        string;
    txCount:           number;
    txs:               Tx[];
}

export interface Tx {
    txid:          string;
    vin:           Vin[];
    vout:          Vin[];
    blockHash:     string;
    blockHeight:   number;
    confirmations: number;
    blockTime:     number;
    value:         string;
    valueIn:       string;
    fees:          string;
}

export interface Vin {
    n:          number;
    isAddress:  boolean;
    value:      string;
    addresses?: string[];
    spent?:     boolean;
}
