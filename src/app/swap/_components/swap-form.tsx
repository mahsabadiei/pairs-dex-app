"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "ethers";
import toast from "react-hot-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Route } from "@lifi/sdk";
import { executeSwap, getQuote, getSupportedTokens } from "../_lib/utils/swap";
import ChainSelector from "./chain-selector";
import TokenSelector from "./token-selector";
import type { Token } from "@lifi/types";

const DEFAULT_TOKENS: Record<number, string> = {
  1: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH for chain 1
  // 137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // MATIC for chain 137
};

const SwapForm = () => {
  const { address } = useAccount();
  const [fromChain, setFromChain] = useState(1);
  const [toChain, setToChain] = useState(137);
  const [fromToken, setFromToken] = useState(DEFAULT_TOKENS[1]);
  const [toToken, setToToken] = useState(DEFAULT_TOKENS[1]);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetQuote = async () => {
    if (!address || !amount || !fromToken || !toToken) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setQuote(null); // Clear previous quote

      // Fetch supported tokens for the source chain to determine decimals
      const tokensList = await getSupportedTokens(fromChain);
      const tokenObj = tokensList.find(
        (token: Token) =>
          token.address.toLowerCase() === fromToken.toLowerCase()
      );
      const fromTokenDecimals = tokenObj ? tokenObj.decimals : 18;

      const formattedAmount = parseUnits(amount, fromTokenDecimals).toString();
      const fetchedQuote = await getQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: formattedAmount,
        fromAddress: address,
      });
      setQuote(fetchedQuote);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get quote";

      let userMessage = errorMessage;
      if (errorMessage.includes("Amount is too high")) {
        userMessage =
          "The amount you entered is too high for this swap. Try a smaller amount.";
      } else if (errorMessage.includes("Insufficient liquidity")) {
        userMessage =
          "There is not enough liquidity for this swap. Try a different token pair or a smaller amount.";
      } else if (errorMessage.includes("Price impact")) {
        userMessage =
          "The price impact for this swap is too high. Try a smaller amount or a different token pair.";
      }
      toast.error(userMessage, {
        duration: 5000,
        style: { maxWidth: "500px" },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote) return;

    try {
      const result = await executeSwap(quote);
      toast.success("Swap initiated!");
      console.log("Transaction:", result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Swap failed");
    }
  };

  return (
    <div className="w-[600px] max-w-md p-6 rounded-2xl border-2 border-white bg-neutralCream">
      <div className="flex justify-between items-center mb-6">
        {/* <h1 className="text-2xl font-bold">Multi-Chain Swap</h1> */}
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

        <div className="space-y-2">
          <label className="block text-sm font-medium">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            step="any"
          />
        </div>

        <div className="mt-4 space-y-4">
          <button
            onClick={handleGetQuote}
            disabled={loading || !address}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!address
              ? "Connect Wallet"
              : loading
              ? "Fetching Quote..."
              : "Get Quote"}
          </button>

          {quote && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Swap Quote</h3>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span>Est. Gas (USD):</span>
                  <span>
                    {quote.gasCostUSD
                      ? `$${Number(quote.gasCostUSD).toFixed(2)}`
                      : "N/A"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Est. Duration:</span>
                  <span>
                    {quote.steps.length
                      ? `${Math.ceil(
                          quote.steps.reduce(
                            (sum, step) =>
                              sum + step.estimate.executionDuration,
                            0
                          ) / 60
                        )} mins`
                      : "N/A"}
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <h4 className="font-medium mb-2">Route Details:</h4>
                {quote.steps.map((step, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 p-3 rounded-lg my-2 text-sm"
                  >
                    <p className="font-medium mb-1">
                      Step {index + 1}: {step.tool}
                    </p>
                    <div className="space-y-1 text-gray-600">
                      <p className="flex justify-between">
                        <span>Gas Cost:</span>
                        <span>
                          {step.estimate.gasCosts &&
                          step.estimate.gasCosts.length > 0
                            ? `$${Number(
                                step.estimate.gasCosts[0].amountUSD
                              ).toFixed(2)}`
                            : "N/A"}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>Duration:</span>
                        <span>
                          {Math.ceil(step.estimate.executionDuration / 60)} mins
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
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
