"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  connectorsForWallets,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  argentWallet,
  trustWallet,
  ledgerWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import {
  arbitrum,
  mainnet,
  optimism,
  polygon,
  avalanche,
  bsc,
  base,
  gnosis,
  celo,
  fantom,
  linea,
  zora,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { initializeLiFi } from "@/lib/lifi/config";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string;

// All chains that we want to support (matching LI.FI's supported chains)
const supportedChains = [
  mainnet, // Ethereum
  polygon, // Polygon
  arbitrum, // Arbitrum
  optimism, // Optimism
  avalanche, // Avalanche
  bsc, // BNB Chain
  base, // Base
  gnosis, // Gnosis
  celo, // Celo
  fantom, // Fantom
  linea, // Linea
  zora, // Zora
] as const;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended Wallet",
      wallets: [rainbowWallet],
    },
    {
      groupName: "Other",
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        argentWallet,
        trustWallet,
        ledgerWallet,
      ],
    },
  ],
  {
    appName: "Pairs Dex App",
    projectId,
  }
);

const transports = {
  [mainnet.id]: http(),
  [polygon.id]: http(),
  [arbitrum.id]: http(),
  [optimism.id]: http(),
  [avalanche.id]: http(),
  [bsc.id]: http(),
  [base.id]: http(),
  [gnosis.id]: http(),
  [celo.id]: http(),
  [fantom.id]: http(),
  [linea.id]: http(),
  [zora.id]: http(),
} as const;

export const wagmiConfig = createConfig({
  chains: supportedChains,
  multiInjectedProviderDiscovery: false,
  connectors,
  ssr: true,
  transports,
});

const queryClient = new QueryClient();

function LiFiInitializer() {
  React.useEffect(() => {
    // Initialize LI.FI SDK on the client-side
    initializeLiFi();
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={lightTheme({
              accentColor: "#1A1A1A",
              accentColorForeground: "white",
              borderRadius: "medium",
            })}
          >
            <LiFiInitializer />
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}
