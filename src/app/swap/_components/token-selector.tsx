'use client';

import { useState, useEffect } from 'react';
import { getSupportedTokens } from '../_lib/utils/swap';

const DEFAULT_TOKENS = {
  1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // MATIC
};

const TokenSelector = ({
  chainId,
  selectedToken,
  onChange,
}: {
  chainId: number;
  selectedToken: string;
  onChange: (token: string) => void;
}) => {
  const [tokens, setTokens] = useState<Record<string, any>>({});

  useEffect(() => {
    getSupportedTokens(chainId).then((tokenList) => {
      setTokens(tokenList);
    });
  }, [chainId]);

  return (
    <select
      value={selectedToken}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded"
    >
      <option value={DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS]}>
        Native Token
      </option>
      {Object.values(tokens).map((token: any) => (
        <option key={token.address} value={token.address}>
          {token.symbol}
        </option>
      ))}
    </select>
  );
};

export default TokenSelector;
