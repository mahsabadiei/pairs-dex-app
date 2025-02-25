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
import { arbitrum, mainnet, optimism, polygon } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
// LI.FI doesn't have a dedicated provider component in their SDK
// We'll use their SDK directly in our components

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string;

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

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism],
  multiInjectedProviderDiscovery: false,
  connectors,
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={lightTheme({
              accentColor: "#1A1A1A",
              accentColorForeground: "white",
              borderRadius: "medium",
            })}
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}
