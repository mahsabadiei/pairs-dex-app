import { EVM, createConfig } from "@lifi/sdk";
import { getWalletClient, switchChain } from "@wagmi/core";
import { wagmiConfig } from "@/app/providers";

let initialized = false;

// Define the supported chain IDs in your Wagmi config
type SupportedChainId =
  | 1
  | 137
  | 42161
  | 10
  | 43114
  | 56
  | 8453
  | 100
  | 42220
  | 250
  | 59144
  | 7777777;

// Map Li.Fi ChainIds to Wagmi chain IDs
const chainIdMap: Record<number, SupportedChainId | undefined> = {
  1: 1, // Ethereum
  137: 137, // Polygon
  42161: 42161, // Arbitrum
  10: 10, // Optimism
  43114: 43114, // Avalanche
  56: 56, // BNB Chain
  8453: 8453, // Base
  100: 100, // Gnosis
  42220: 42220, // Celo
  250: 250, // Fantom
  59144: 59144, // Linea
  7777777: 7777777, // Zora
};

export function initializeLiFi() {
  if (initialized) return;

  try {
    createConfig({
      integrator: "pairs-dex",
      providers: [
        EVM({
          getWalletClient: async () => {
            const client = await getWalletClient(wagmiConfig);
            if (!client) {
              throw new Error("No wallet client available");
            }
            return client;
          },
          switchChain: async (chainId) => {
            console.log(`Switching to chain: ${chainId}`);
            try {
              // Map Li.Fi chainId to Wagmi supported chainId
              const supportedChainId = chainIdMap[chainId];

              if (!supportedChainId) {
                console.error(
                  `Chain ID ${chainId} is not supported in your Wagmi configuration`
                );
                throw new Error(`Unsupported chain: ${chainId}`);
              }

              // Switch chain using Wagmi
              await switchChain(wagmiConfig, {
                chainId: supportedChainId,
              });

              // Get client for the new chain
              const client = await getWalletClient(wagmiConfig, {
                chainId: supportedChainId,
              });

              if (!client) {
                throw new Error(
                  "No wallet client available after chain switch"
                );
              }
              return client;
            } catch (error) {
              console.error("Error switching chain:", error);
              throw error;
            }
          },
        }),
      ],
      // Optional API key for higher rate limits
      apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY,

      // Default routing options
      routeOptions: {
        slippage: 0.005, // 0.5%
        order: "RECOMMENDED",
        allowSwitchChain: true,
      },

      // You can preload chains for better performance
      preloadChains: true,
    });

    initialized = true;
    console.log("LI.FI SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize LI.FI SDK:", error);
    throw error;
  }
}
