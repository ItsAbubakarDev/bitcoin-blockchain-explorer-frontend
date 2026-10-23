export interface Address {
    page:               number;
    totalPages:         number;
    itemsOnPage:        number;
    address:            string;
    balance:            string;
    totalReceived:      string;
    totalSent:          string;
    unconfirmedBalance: string;
    unconfirmedTxs:     number;
    txs:                number;
    transactions?:      Transaction[];
}

export interface Transaction {
    txid:          string;
    version:       number;
    lockTime:      number;
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
    txid:      string;
    sequence:  number;
    n:         number;
    addresses: AddressElement[];
    isAddress: boolean;
    value:     string;
    hex?:      string;
    isOwn?:    boolean;
    vout?:     number;
}

export enum AddressElement {
    Bc1Q3Hy83Rjwey9Prfvyx6Al0N0Srmcg08W5Mav3Cl = "bc1q3hy83rjwey9prfvyx6al0n0srmcg08w5mav3cl",
    Bc1Q9Y5Pz3Nfyksh2E3Dglqe7Ve70Tj9Hervy5L6Yn = "bc1q9y5pz3nfyksh2e3dglqe7ve70tj9hervy5l6yn",
    Bc1Qmw0Uzz29Hkespjre0Wa7U6M82Uskyqcv0Wfet5 = "bc1qmw0uzz29hkespjre0wa7u6m82uskyqcv0wfet5",
    Bc1Qy76Qm3X2Xyr0Ucuf3Et0Cml8Y5Rfmwc4Lql4Hl = "bc1qy76qm3x2xyr0ucuf3et0cml8y5rfmwc4lql4hl",
    The12XT5VyC69DYpXoGCpkFEPGGYpChnZuxmW = "12XT5VyC69DYpXoGCpkFEPgGYpChnZuxmW",
}

export interface Vout {
    value:     string;
    n:         number;
    spent?:    boolean;
    hex:       string;
    addresses: string[];
    isAddress: boolean;
    isOwn?:    boolean;
}
