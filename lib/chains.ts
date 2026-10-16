export const SUBMIT_CHAINS = [
  { value: "solana", label: "Solana" },
  { value: "base", label: "Base" },
  { value: "ethereum", label: "Ethereum" },
  { value: "bsc", label: "BSC" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "robinhood", label: "Robinhood" },
] as const;

const CHAIN_VALUES = new Set<string>(SUBMIT_CHAINS.map((chain) => chain.value));

export function isSubmitChain(value: string): boolean {
  return CHAIN_VALUES.has(value);
}
