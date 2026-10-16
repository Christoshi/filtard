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

export function chainLabel(value: string): string {
  const found = SUBMIT_CHAINS.find((chain) => chain.value === value.toLowerCase());
  return found?.label || value;
}
