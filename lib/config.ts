// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
export const COIN_NAME = process.env.NEXT_PUBLIC_COIN_NAME || "Bitcoin Genesis 1";
export const COIN_SYMBOL = process.env.NEXT_PUBLIC_COIN_SYMBOL || "BTC1";
export const EXPLORER_TITLE = process.env.NEXT_PUBLIC_EXPLORER_TITLE || "BTC1 Explorer";
export const BLOCKBOOK_API_URL = process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL || "";
export const BLOCKBOOK_WS_URL = process.env.NEXT_PUBLIC_BLOCKBOOK_WS_URL || "";

/** Satoshi decimals. status.json reports `blockbook.decimals: 8`. */
export const COIN_DECIMALS = 8;

export const PAGE_SIZE = {
  blocks: 20,
  blockTxs: 50,
  addressTxs: 25,
  dashboard: 10,
} as const;

/**
 * Blockbook v0.6.0 ignores `pageSize` on /block and always pages block txs 1000 at a time
 * (verified live: `?pageSize=1` still returned itemsOnPage: 1000).
 */
export const BLOCKBOOK_BLOCK_PAGE_SIZE = 1000;
