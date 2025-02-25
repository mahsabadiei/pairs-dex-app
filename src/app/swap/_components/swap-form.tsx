"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseUnits } from "ethers";
import toast from "react-hot-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Route } from "@lifi/sdk";
import {
  executeSwap,
  getQuote,
  getSupportedTokens,
  fetchTokenBalance,
  checkAndSetAllowance,
  formatTokenAmount,
  fetchToken,
  fetchMultipleTokenBalances,
} from "@/lib/utils/swap";
import ChainSelector from "./chain-selector";
import TokenSelector from "./token-selector";
import type { Token } from "@lifi/types";
import { ArrowDownIcon, RefreshCw, Settings } from "lucide-react";

// Native token addresses
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Default tokens by chain
const DEFAULT_TOKENS: Record<number, string> = {
  1: NATIVE_TOKEN_ADDRESS, // ETH for Ethereum
  137: NATIVE_TOKEN_ADDRESS, // MATIC for Polygon
  42161: NATIVE_TOKEN_ADDRESS, // ETH for Arbitrum
  10: NATIVE_TOKEN_ADDRESS, // ETH for Optimism
};

// Token symbols by chain for native tokens
const NATIVE_TOKEN_SYMBOLS: Record<number, string> = {
  1: "ETH",
  137: "MATIC",
  42161: "ETH",
  10: "ETH",
};

// Swap status enum
enum SwapStatus {
  IDLE = "idle",
  FETCHING_QUOTE = "fetching_quote",
  QUOTE_READY = "quote_ready",
  APPROVING = "approving",
  SWAPPING = "swapping",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Transaction status for UI
interface TransactionStatus {
  status: "pending" | "success" | "failed";
  message: string;
  txHash?: string;
}

const SwapForm = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // State for chain and token selection
  const [fromChain, setFromChain] = useState(1); // Default to Ethereum
  const [toChain, setToChain] = useState(137); // Default to Polygon
  const [fromToken, setFromToken] = useState(DEFAULT_TOKENS[1]);
  const [toToken, setToToken] = useState(DEFAULT_TOKENS[137]);

  // State for amount and quotes
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Route | null>(null);
  const [swapStatus, setSwapStatus] = useState<SwapStatus>(SwapStatus.IDLE);

  // State for token balances
  const [fromTokenBalance, setFromTokenBalance] = useState<string | null>(null);
  const [fromTokenDecimals, setFromTokenDecimals] = useState(18);
  const [toTokenBalance, setToTokenBalance] = useState<string | null>(null);

  // State for advanced settings
  const [slippage, setSlippage] = useState(0.5); // 0.5%
  const [showSettings, setShowSettings] = useState(false);

  // State for transaction status
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);

  // Reset when chain or token changes
  useEffect(() => {
    setQuote(null);
    setSwapStatus(SwapStatus.IDLE);
    setTxStatus(null);
  }, [fromChain, toChain, fromToken, toToken]);

  // Update token info when tokens change
  useEffect(() => {
    const updateTokenInfo = async () => {
      if (!address) return;

      try {
        // Get tokens
        const fromTokenObj = await fetchToken(fromChain, fromToken);
        const toTokenObj = await fetchToken(toChain, toToken);

        if (fromTokenObj) {
          setFromTokenDecimals(fromTokenObj.decimals);
        }

        // Get token balances using the correct API
        try {
          // Option 1: Get both balances at once (more efficient)
          const balances = await fetchMultipleTokenBalances(address, [
            fromTokenObj,
            toTokenObj,
          ]);

          if (balances[fromToken]) {
            setFromTokenBalance(balances[fromToken]);
          }

          if (balances[toToken]) {
            setToTokenBalance(balances[toToken]);
          }
        } catch (batchError) {
          console.error("Error fetching multiple balances:", batchError);

          // Option 2: Fallback to individual fetches
          try {
            const fromBalance = await fetchTokenBalance(address, fromTokenObj);
            setFromTokenBalance(fromBalance);

            const toBalance = await fetchTokenBalance(address, toTokenObj);
            setToTokenBalance(toBalance);
          } catch (singleFetchError) {
            console.error(
              "Error fetching individual balances:",
              singleFetchError
            );
          }
        }
      } catch (error) {
        console.error("Error updating token info:", error);
      }
    };

    updateTokenInfo();
  }, [address, fromChain, toChain, fromToken, toToken]);

  // Swap chain and token values
  const handleSwapDirection = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  };

  // Set max amount
  const handleSetMaxAmount = () => {
    if (fromTokenBalance) {
      // Format the balance to a user-friendly number
      const formatted = formatTokenAmount(fromTokenBalance, fromTokenDecimals);
      setAmount(formatted);
    }
  };

  // Get quote for the swap
  const handleGetQuote = async () => {
    if (
      !address ||
      !amount ||
      !fromToken ||
      !toToken ||
      parseFloat(amount) <= 0
    ) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSwapStatus(SwapStatus.FETCHING_QUOTE);
      setQuote(null);

      // Convert amount to on-chain format with correct decimals
      const formattedAmount = parseUnits(amount, fromTokenDecimals).toString();

      // Check if user has enough balance
      if (fromTokenBalance) {
        const currentBalance = BigInt(fromTokenBalance);
        const requestedAmount = BigInt(formattedAmount);

        if (currentBalance < requestedAmount) {
          toast.error("Insufficient balance for this swap");
          setSwapStatus(SwapStatus.IDLE);
          return;
        }
      }

      // Get quote from LI.FI
      const fetchedQuote = await getQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: formattedAmount,
        fromAddress: address,
        slippage: slippage / 100, // Convert from percentage to decimal
        allowSwitchChain: true,
      });

      setQuote(fetchedQuote);
      setSwapStatus(SwapStatus.QUOTE_READY);
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

      setSwapStatus(SwapStatus.IDLE);
    }
  };

  // Execute the swap
  const handleSwap = async () => {
    if (!quote || !walletClient || !walletClient.account || !address) return;

    try {
      // First check if we need to approve token (for ERC20 tokens only)
      if (fromToken !== NATIVE_TOKEN_ADDRESS) {
        setSwapStatus(SwapStatus.APPROVING);
        setTxStatus({
          status: "pending",
          message: "Approving token...",
        });

        // Find token info
        const tokensList = await getSupportedTokens(fromChain);
        const tokenObj = tokensList.find(
          (token: Token) =>
            token.address.toLowerCase() === fromToken.toLowerCase()
        );

        if (tokenObj) {
          const spenderAddress = quote.steps[0].estimate.approvalAddress;
          const amountBigInt = BigInt(quote.fromAmount);

          try {
            await checkAndSetAllowance({
              walletClient,
              token: tokenObj,
              spenderAddress,
              amount: amountBigInt,
            });

            setTxStatus({
              status: "success",
              message: "Token approved successfully",
            });
          } catch (error) {
            setTxStatus({
              status: "failed",
              message: "Token approval failed",
            });
            throw error;
          }
        }
      }

      // Execute the swap
      setSwapStatus(SwapStatus.SWAPPING);
      setTxStatus({
        status: "pending",
        message: "Swap in progress...",
      });

      // Execute with status updates
      const result = await executeSwap(quote, walletClient, (status) => {
        console.log("Swap status update:", status);
        // Handle status updates here
        if (status.status === "DONE") {
          setTxStatus({
            status: "success",
            message: "Swap completed successfully",
            txHash: status.txHash,
          });
          setSwapStatus(SwapStatus.COMPLETED);

          // Update balances after swap
          updateBalances();
        }
      });

      toast.success("Swap successfully initiated!");
      console.log("Transaction:", result);

      // Reset form after successful swap
      setTimeout(() => {
        setAmount("");
        setQuote(null);
        setSwapStatus(SwapStatus.IDLE);
      }, 5000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Swap failed";
      toast.error(errorMessage);
      console.error("Swap error:", error);

      setTxStatus({
        status: "failed",
        message: errorMessage,
      });

      setSwapStatus(SwapStatus.FAILED);
    }
  };

  // Update balances after swap
  const updateBalances = async () => {
    if (!address) return;

    try {
      // Get tokens
      const fromTokenObj = await fetchToken(fromChain, fromToken);
      const toTokenObj = await fetchToken(toChain, toToken);

      // Get token balances
      try {
        const balances = await fetchMultipleTokenBalances(address, [
          fromTokenObj,
          toTokenObj,
        ]);

        if (balances[fromToken]) {
          setFromTokenBalance(balances[fromToken]);
        }

        if (balances[toToken]) {
          setToTokenBalance(balances[toToken]);
        }
      } catch (batchError) {
        console.error("Error fetching multiple balances:", batchError);

        // Fallback to individual fetches
        try {
          const fromBalance = await fetchTokenBalance(address, fromTokenObj);
          setFromTokenBalance(fromBalance);

          const toBalance = await fetchTokenBalance(address, toTokenObj);
          setToTokenBalance(toBalance);
        } catch (singleFetchError) {
          console.error(
            "Error fetching individual balances:",
            singleFetchError
          );
        }
      }
    } catch (error) {
      console.error("Error updating balances:", error);
    }
  };

  // Get native token symbol for a chain
  const getNativeTokenSymbol = (chainId: number) => {
    return NATIVE_TOKEN_SYMBOLS[chainId] || "ETH";
  };

  // Format token amount for display
  const formatAmount = (amount: string, decimals: number) => {
    return formatTokenAmount(amount, decimals);
  };

  // Get button text based on swap status
  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";

    switch (swapStatus) {
      case SwapStatus.FETCHING_QUOTE:
        return "Fetching Quote...";
      case SwapStatus.APPROVING:
        return "Approving Token...";
      case SwapStatus.SWAPPING:
        return "Confirming Swap...";
      case SwapStatus.QUOTE_READY:
        return "Confirm Swap";
      case SwapStatus.COMPLETED:
        return "Swap Completed";
      case SwapStatus.FAILED:
        return "Swap Failed";
      default:
        return amount && parseFloat(amount) > 0 ? "Get Quote" : "Enter Amount";
    }
  };

  // Check if button should be disabled
  const isButtonDisabled = () => {
    if (!isConnected) return false;
    if (
      swapStatus === SwapStatus.FETCHING_QUOTE ||
      swapStatus === SwapStatus.APPROVING ||
      swapStatus === SwapStatus.SWAPPING
    ) {
      return true;
    }
    if (swapStatus === SwapStatus.QUOTE_READY && !walletClient) {
      return true;
    }
    if (
      swapStatus === SwapStatus.IDLE &&
      (!amount || parseFloat(amount) <= 0)
    ) {
      return true;
    }
    return false;
  };

  // Handle button click based on status
  const handleButtonClick = () => {
    if (!isConnected) {
      // ConnectButton will handle this
      return;
    }

    if (swapStatus === SwapStatus.IDLE) {
      handleGetQuote();
    } else if (swapStatus === SwapStatus.QUOTE_READY) {
      handleSwap();
    }
  };

  return (
    <div className="w-[600px] max-w-md p-6 rounded-2xl border-2 border-white bg-neutral-cream shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <ConnectButton />
      </div>

      <div className="space-y-6">
        {/* From section */}
        <div className="p-4 bg-white rounded-xl border">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-600">From</label>
            {fromTokenBalance && (
              <div className="text-sm text-gray-600">
                Balance: {formatAmount(fromTokenBalance, fromTokenDecimals)}{" "}
                {fromToken === NATIVE_TOKEN_ADDRESS
                  ? getNativeTokenSymbol(fromChain)
                  : ""}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full p-2 text-xl font-medium focus:outline-none"
              disabled={
                swapStatus === SwapStatus.APPROVING ||
                swapStatus === SwapStatus.SWAPPING
              }
            />

            <button
              onClick={handleSetMaxAmount}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              MAX
            </button>
          </div>

          <div className="flex justify-between items-center">
            <ChainSelector selectedChain={fromChain} onChange={setFromChain} />
            <TokenSelector
              chainId={fromChain}
              selectedToken={fromToken}
              onChange={setFromToken}
            />
          </div>
        </div>

        {/* Swap direction button */}
        <div className="flex justify-center -my-3">
          <button
            onClick={handleSwapDirection}
            className="bg-white p-2 rounded-full shadow-md border hover:bg-gray-50 transition-colors"
          >
            <ArrowDownIcon className="w-5 h-5" />
          </button>
        </div>

        {/* To section */}
        <div className="p-4 bg-white rounded-xl border">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-600">To</label>
            {toTokenBalance && (
              <div className="text-sm text-gray-600">
                Balance: {formatAmount(toTokenBalance, 18)}{" "}
                {toToken === NATIVE_TOKEN_ADDRESS
                  ? getNativeTokenSymbol(toChain)
                  : ""}
              </div>
            )}
          </div>

          <div className="mb-3">
            <div className="w-full p-2 text-xl font-medium text-gray-500">
              {quote
                ? formatAmount(quote.toAmount, quote.toToken?.decimals || 18)
                : "0.0"}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <ChainSelector selectedChain={toChain} onChange={setToChain} />
            <TokenSelector
              chainId={toChain}
              selectedToken={toToken}
              onChange={setToToken}
            />
          </div>
        </div>

        {/* Settings */}
        <div className="flex justify-between items-center text-sm">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={updateBalances}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Advanced settings panel */}
        {showSettings && (
          <div className="p-4 bg-white rounded-xl border">
            <h3 className="font-medium mb-2">Advanced Settings</h3>
            <div className="flex items-center justify-between">
              <label className="text-sm">Slippage Tolerance</label>
              <div className="flex items-center gap-2">
                {[0.5, 1, 2].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`px-2 py-1 text-xs rounded ${
                      slippage === value
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <div className="flex items-center">
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) =>
                      setSlippage(parseFloat(e.target.value) || 0.5)
                    }
                    className="w-12 p-1 text-xs border rounded text-center"
                    min="0.1"
                    max="50"
                    step="0.1"
                  />
                  <span className="text-xs ml-1">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quote details */}
        {quote && (
          <div className="p-4 bg-gray-50 rounded-xl border">
            <h3 className="font-medium mb-2">Swap Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Exchange Rate</span>
                <span>
                  1 {quote.fromToken?.symbol} ={" "}
                  {(Number(quote.toAmount) / Number(quote.fromAmount)).toFixed(
                    6
                  )}{" "}
                  {quote.toToken?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Gas</span>
                <span>${Number(quote.gasCostUSD || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time</span>
                <span>
                  {Math.ceil(
                    quote.steps.reduce(
                      (sum, step) => sum + step.estimate.executionDuration,
                      0
                    ) / 60
                  )}{" "}
                  mins
                </span>
              </div>
              <div className="flex justify-between">
                <span>Route Type</span>
                <span>
                  {fromChain === toChain ? "Same Chain" : "Cross Chain"}
                </span>
              </div>
              <div className="border-t pt-1 mt-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Provided by</span>
                  <span>LI.FI</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction status */}
        {txStatus && (
          <div
            className={`p-3 rounded-lg ${
              txStatus.status === "pending"
                ? "bg-yellow-50 border border-yellow-200"
                : txStatus.status === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  txStatus.status === "pending"
                    ? "bg-yellow-500"
                    : txStatus.status === "success"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm">{txStatus.message}</span>
            </div>
            {txStatus.txHash && (
              <div className="mt-1 text-xs text-blue-500">
                <a
                  href={`https://etherscan.io/tx/${txStatus.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Etherscan
                </a>
              </div>
            )}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleButtonClick}
          disabled={isButtonDisabled()}
          className="w-full bg-black py-3 px-4 rounded-xl text-white font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default SwapForm;
