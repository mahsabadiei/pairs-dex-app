import {
  type Route,
  getRoutes,
  getTokens,
  executeRoute,
  getChains,
  getTokenBalance,
  setTokenAllowance,
} from "@lifi/sdk";
// import { ethers } from 'ethers';
import type { BaseToken, Token } from "@lifi/types";
import { Client } from "viem";

export interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}

export const fetchChains = async () => {
  try {
    const chains = await getChains();
    console.log(chains);
  } catch (error) {
    console.error("Error fetching chains:", error);
  }
};

export const getSupportedTokens = async (chainId: number): Promise<Token[]> => {
  const tokensResponse = await getTokens();
  const tokensArray = tokensResponse.tokens[chainId];

  if (!tokensArray) {
    throw new Error(`No tokens found for chainId ${chainId}`);
  }

  return tokensArray;
};

export const fetchTokenBalance = async (
  chainId: string,
  tokenAddress: Token
) => {
  try {
    const balance = await getTokenBalance(chainId, tokenAddress);
    console.log(balance);
  } catch (error) {
    console.error("Error fetching token balance:", error);
  }
};

export const setAllowance = async ({
  walletClient,
  token,
  spenderAddress,
  amount,
}: {
  walletClient: Client;
  token: BaseToken;
  spenderAddress: string;
  amount: bigint;
}) => {
  try {
    await setTokenAllowance({ walletClient, token, spenderAddress, amount });
    console.log("Allowance set successfully");
  } catch (error) {
    console.error("Error setting allowance:", error);
  }
};

export const getQuote = async (params: QuoteParams): Promise<Route> => {
  const routes = await getRoutes({
    fromChainId: params.fromChain,
    fromTokenAddress: params.fromToken,
    fromAmount: params.fromAmount,
    toChainId: params.toChain,
    toTokenAddress: params.toToken,
    fromAddress: params.fromAddress,
  });

  if (!routes.routes.length) {
    if (routes.unavailableRoutes) {
      if (routes.unavailableRoutes.filteredOut?.length > 0) {
        const reason = routes.unavailableRoutes.filteredOut[0].reason;
        throw new Error(`Route filtered out: ${reason}`);
      }
      if (routes.unavailableRoutes.failed?.length > 0) {
        const failedRoute = routes.unavailableRoutes.failed[0];
        const subpathErrors = Object.values(failedRoute.subpaths)[0];
        if (subpathErrors?.length > 0) {
          const relevantError = subpathErrors.find(
            (error) =>
              error.code === "AMOUNT_TOO_HIGH" ||
              error.code === "NO_POSSIBLE_ROUTE" ||
              error.message.includes("Insufficient liquidity")
          );
          if (relevantError) {
            if (relevantError.code === "AMOUNT_TOO_HIGH") {
              throw new Error("Amount is too high for this swap");
            } else if (
              relevantError.message.includes("Insufficient liquidity")
            ) {
              throw new Error("Insufficient liquidity for this swap");
            } else {
              throw new Error("No possible route found for this swap");
            }
          }
        }
      }
    }
    throw new Error("No available routes found for this swap");
  }

  return routes.routes[0]; // Return the best route
};

export const executeSwap = async (route: Route) => {
  if (!window.ethereum) {
    throw new Error("Ethereum provider not found");
  }

  // Create Web3Provider from window.ethereum (using ethers v6)
  // const provider = new ethers.BrowserProvider(window.ethereum);
  // const signer = await provider.getSigner();

  try {
    const result = await executeRoute(route);
    console.log("Swap executed successfully:", result);
    return result;
  } catch (error) {
    console.error("Error executing swap:", error);
    throw error;
  }
};
