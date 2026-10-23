export interface Tx {
    txid:          string;
    version:       number;
    lockTime?:     number;
    vin:           Vin[];
    vout:          Vout[];
    blockHash:     string;
    blockHeight:   number;
    confirmations: number;
    blockTime:     number;
    size:          number;
    vsize:         number;
    value:         string;
    valueIn:       string;
    fees:          string;
    hex:           string;
}

export interface Vin {
    txid?:      string;
    sequence:   number;
    n:          number;
    addresses?: Address[];
    isAddress:  boolean;
    value?:     string;
    hex?:       string;
    coinbase?:  string;
}

export enum Address {
    Bc1Q9Y5Pz3Nfyksh2E3Dglqe7Ve70Tj9Hervy5L6Yn = "bc1q9y5pz3nfyksh2e3dglqe7ve70tj9hervy5l6yn",
    The12XT5VyC69DYpXoGCpkFEPGGYpChnZuxmW = "12XT5VyC69DYpXoGCpkFEPgGYpChnZuxmW",
}

export interface Vout {
    value:     string;
    n:         number;
    spent?:    boolean;
    hex:       string;
    addresses: string[];
    isAddress: boolean;
}
