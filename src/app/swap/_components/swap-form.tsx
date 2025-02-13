'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'ethers';
import toast from 'react-hot-toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Route } from '@lifi/sdk';
import { executeSwap, getQuote } from '../_lib/utils/swap';
import ChainSelector from './chain-selector';
import TokenSelector from './token-selector';

const SwapForm = () => {
  const { address } = useAccount();
  const [fromChain, setFromChain] = useState(1);
  const [toChain, setToChain] = useState(137);
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetQuote = async () => {
    if (!address || !amount || !fromToken || !toToken) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setQuote(null); // Clear previous quote

      // Get token decimals from the token info (you'll need to implement this)
      const fromTokenDecimals = 18; // Default to 18, adjust based on actual token

      const formattedAmount = parseUnits(amount, fromTokenDecimals).toString();
      const quote = await getQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: formattedAmount,
        fromAddress: address,
      });
      setQuote(quote);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get quote';

      // Create a more user-friendly error message
      let userMessage = errorMessage;
      if (errorMessage.includes('Amount is too high')) {
        userMessage =
          'The amount you entered is too high for this swap. Try a smaller amount.';
      } else if (errorMessage.includes('Insufficient liquidity')) {
        userMessage =
          'There is not enough liquidity for this swap. Try a different token pair or a smaller amount.';
      } else if (errorMessage.includes('Price impact')) {
        userMessage =
          'The price impact for this swap is too high. Try a smaller amount or a different token pair.';
      }

      toast.error(userMessage, {
        duration: 5000,
        style: {
          maxWidth: '500px',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote) return;

    try {
      const result = await executeSwap(quote);
      toast.success('Swap initiated!');
      console.log('Transaction:', result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Swap failed');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Multi-Chain Swap</h1>
        <ConnectButton />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">From Chain</label>
          <ChainSelector selectedChain={fromChain} onChange={setFromChain} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">From Token</label>
          <TokenSelector
            chainId={fromChain}
            selectedToken={fromToken}
            onChange={setFromToken}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">To Chain</label>
          <ChainSelector selectedChain={toChain} onChange={setToChain} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">To Token</label>
          <TokenSelector
            chainId={toChain}
            selectedToken={toToken}
            onChange={setToToken}
          />
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-2 border rounded"
        />

        <div className="mt-4 space-y-4">
          <button
            onClick={handleGetQuote}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Fetching Quote...' : 'Get Quote'}
          </button>

          {quote && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Swap Quote</h3>
              <div className="space-y-1">
                <p>Estimated Gas (USD): {quote.gasCostUSD}</p>
                <p>
                  Estimated Duration:{' '}
                  {Math.ceil(quote.steps[0].estimate.executionDuration / 60)}{' '}
                  mins
                </p>
              </div>

              <button
                onClick={handleSwap}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Confirm Swap
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapForm;
