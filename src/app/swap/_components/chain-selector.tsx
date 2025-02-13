'use client';

import { useChainId, useSwitchChain } from 'wagmi';
import { config } from '@/app/providers';

const ChainSelector = ({
  selectedChain,
  onChange,
}: {
  selectedChain: number;
  onChange: (chainId: number) => void;
}) => {
  const { chains } = config;
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();

  return (
    <select
      value={selectedChain}
      onChange={(e) => {
        const chainId = Number(e.target.value);
        onChange(chainId);
        if (chainId !== currentChainId) switchChain({ chainId });
      }}
      className="w-full p-2 border rounded"
    >
      {chains.map((chain) => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
};

export default ChainSelector;
