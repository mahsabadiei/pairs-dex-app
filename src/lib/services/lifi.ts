import { createConfig, ChainId } from "@lifi/sdk";

createConfig({
  integrator: "pairs-dex", // Changed to valid format (no spaces, only allowed characters)
  apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY, // Add an API key for better rate limits
  routeOptions: {
    slippage: 0.005, // 0.5% default slippage
    order: "RECOMMENDED", // Default order
    allowSwitchChain: true, // Allow chain switching
  },
  rpcUrls: {
    [ChainId.ETH]: [
      "https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    ],
    [ChainId.POL]: [
      "https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      "https://polygon-rpc.com",
    ],
    [ChainId.ARB]: [
      "https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      "https://arbitrum-one.publicnode.com",
    ],
    [ChainId.OPT]: [
      "https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      "https://mainnet.optimism.io",
    ],
    // Add more chains as needed
  },
});
