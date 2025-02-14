import { createConfig, ChainId } from '@lifi/sdk';

createConfig({
  integrator: 'Pairs Dex App',
  rpcUrls: {
    [ChainId.ARB]: ['https://arbitrum-example.node.com/'],
    [ChainId.SOL]: ['https://solana-example.node.com/'],
  },
});
