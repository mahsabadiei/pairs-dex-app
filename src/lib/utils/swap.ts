import {
  type Route,
  getRoutes,
  getTokens,
  executeRoute,
  getChains,
  getTokenBalance,
  setTokenAllowance,
  getToken,
  getTokenBalances,
  ExecutionOptions,
  RouteExtended,
} from "@lifi/sdk";
import type { BaseToken, Token, UnavailableRoutes } from "@lifi/types";
import { Client } from "viem";

export interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage?: number;
  allowSwitchChain?: boolean;
}

// Get all supported chains
export const fetchChains = async () => {
  try {
    const chains = await getChains();
    return chains;
  } catch (error) {
    console.error("Error fetching chains:", error);
    throw error;
  }
};

// Get tokens for a specific chain
export const getSupportedTokens = async (chainId: number): Promise<Token[]> => {
  try {
    const tokensResponse = await getTokens();
    const tokensArray = tokensResponse.tokens[chainId];

    if (!tokensArray) {
      throw new Error(`No tokens found for chainId ${chainId}`);
    }

    return tokensArray;
  } catch (error) {
    console.error(`Error fetching tokens for chain ${chainId}:`, error);
    throw error;
  }
};

// Get token details
export const fetchToken = async (
  chainId: number,
  tokenAddress: string
): Promise<Token> => {
  try {
    const token = await getToken(chainId, tokenAddress);
    return token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
};

// Get token balance using the correct parameter order
export const fetchTokenBalance = async (
  walletAddress: string,
  token: Token
): Promise<string> => {
  try {
    const tokenAmount = await getTokenBalance(walletAddress, token);

    // Handle the null case and return the amount as a string
    if (!tokenAmount || tokenAmount.amount === undefined) {
      return "0"; // Return "0" if the token amount is null or undefined
    }

    // Return the amount as a string
    return tokenAmount.amount.toString();
  } catch (error) {
    console.error("Error fetching token balance:", error);
    throw error;
  }
};

// Fetch multiple token balances and convert to Record<string, string>
export const fetchMultipleTokenBalances = async (
  walletAddress: string,
  tokens: Token[]
): Promise<Record<string, string>> => {
  try {
    // Get token balances using getTokenBalances function
    const tokenAmounts = await getTokenBalances(walletAddress, tokens);

    // Convert array of TokenAmount objects to Record<string, string>
    const balanceRecord: Record<string, string> = {};

    // Process each token balance
    tokenAmounts.forEach((tokenAmount) => {
      if (
        tokenAmount &&
        tokenAmount.address &&
        tokenAmount.amount !== undefined
      ) {
        // Use lowercase address as key for consistency
        const tokenAddress = tokenAmount.address.toLowerCase();
        balanceRecord[tokenAddress] = tokenAmount.amount.toString();
      }
    });

    return balanceRecord;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    throw error;
  }
};

// Check and set token allowance
export const checkAndSetAllowance = async ({
  walletClient,
  token,
  spenderAddress,
  amount,
}: {
  walletClient: Client;
  token: BaseToken;
  spenderAddress: string;
  amount: bigint;
}): Promise<boolean> => {
  try {
    // Only ERC20 tokens need allowance
    if (token.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
      return true; // Native token doesn't need approval
    }

    // For our purposes, we'll use the simpler approach with setTokenAllowance
    // Since direct contract interaction might not be available in the Client type

    // Just set the allowance directly using LI.FI's SDK function
    await setTokenAllowance({
      walletClient,
      token,
      spenderAddress,
      amount,
    });

    return true;
  } catch (error) {
    console.error("Error setting allowance:", error);
    throw error;
  }
};

// Get quote for a swap
export const getQuote = async (params: QuoteParams): Promise<Route> => {
  try {
    const routes = await getRoutes({
      fromChainId: params.fromChain,
      fromTokenAddress: params.fromToken,
      fromAmount: params.fromAmount,
      toChainId: params.toChain,
      toTokenAddress: params.toToken,
      fromAddress: params.fromAddress,
      options: {
        slippage: params.slippage || 0.005, // Default 0.5% slippage
        allowSwitchChain: params.allowSwitchChain ?? true,
        integrator: "pairs-dex", // Valid format (no spaces, only allowed characters)
        // Add additional configuration as needed
      },
    });

    if (!routes.routes.length) {
      handleNoRoutesError(routes.unavailableRoutes);
    }

    return routes.routes[0]; // Return best route
  } catch (error) {
    console.error("Error getting quote:", error);
    throw handleQuoteError(error);
  }
};

/**
 * Handles errors when no routes are found
 * Extracts meaningful error messages from the unavailableRoutes object
 */
const handleNoRoutesError = (
  unavailableRoutes: UnavailableRoutes | undefined
): never => {
  if (unavailableRoutes) {
    // Handle filtered out routes
    if (
      unavailableRoutes.filteredOut &&
      unavailableRoutes.filteredOut.length > 0
    ) {
      const reason = unavailableRoutes.filteredOut[0].reason;
      throw new Error(`Route filtered out: ${reason}`);
    }

    // Handle failed routes
    if (unavailableRoutes.failed && unavailableRoutes.failed.length > 0) {
      const failedRoute = unavailableRoutes.failed[0];

      // Get the first subpath key
      const subpathKeys = Object.keys(failedRoute.subpaths);

      if (subpathKeys.length > 0) {
        const firstKey = subpathKeys[0];
        const subpathErrors = failedRoute.subpaths[firstKey];

        if (subpathErrors && subpathErrors.length > 0) {
          // Look for specific error types
          const relevantError = subpathErrors.find(
            (error) =>
              error.code === "AMOUNT_TOO_HIGH" ||
              error.code === "NO_POSSIBLE_ROUTE" ||
              (error.message &&
                error.message.includes("Insufficient liquidity"))
          );

          if (relevantError) {
            if (relevantError.code === "AMOUNT_TOO_HIGH") {
              throw new Error("Amount is too high for this swap");
            } else if (
              relevantError.message &&
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
  }

  // Default error message
  throw new Error("No available routes found for this swap");
};

/**
 * Handle errors from getting quotes
 * Formats error messages to be more user-friendly
 */
const handleQuoteError = (error: unknown): Error => {
  // If it's already an Error, use it directly
  if (error instanceof Error) {
    const errorMessage = error.message;

    // Check for specific error messages and provide better user feedback
    if (errorMessage.includes("Insufficient")) {
      return new Error("Insufficient balance or liquidity for this swap");
    }
    if (errorMessage.includes("slippage")) {
      return new Error(
        "Slippage is too high for this swap. Try again or adjust slippage tolerance."
      );
    }

    // Check for SDK-specific errors
    if ("code" in error && typeof error.code === "string") {
      const sdkError = error;

      // Handle specific SDK error codes
      if (sdkError.code === "VALIDATION_ERROR") {
        return new Error("Invalid swap parameters. Please check your inputs.");
      }

      // if (sdkError.code === "REQUEST_FAILED" && sdkError.status === 429) {
      //   return new Error("Too many requests. Please try again in a moment.");
      // }
    }

    return error;
  }

  // If it's an object with a message property
  if (typeof error === "object" && error !== null && "message" in error) {
    return new Error(String(error.message));
  }

  // Default fallback
  return new Error("Unknown error occurred during swap");
};

/**
 * Execute a swap with status tracking
 *
 * @param route The route to execute
 * @param onStatusUpdate Optional callback for status updates
 * @returns The result of the swap execution
 */
export const executeSwap = async (
  route: Route,
  onStatusUpdate?: (updatedRoute: RouteExtended) => void
) => {
  try {
    // Configure execution options
    const executionOptions: ExecutionOptions = {
      updateRouteHook: onStatusUpdate,
    };

    // Execute the route
    const result = await executeRoute(route, executionOptions);

    return result;
  } catch (error) {
    console.error("Error executing swap:", error);
    throw error;
  }
};

// Format amount with proper decimals
export const formatTokenAmount = (amount: string, decimals: number): string => {
  const parsedAmount = parseFloat(amount) / 10 ** decimals;
  return parsedAmount.toLocaleString(undefined, {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  });
};

// Convert display amount to on-chain amount
export const parseTokenAmount = (
  displayAmount: string,
  decimals: number
): string => {
  // Remove commas and other formatting
  const cleanAmount = displayAmount.replace(/,/g, "");

  // Calculate the on-chain amount
  const factor = 10 ** decimals;
  const onChainAmount = Math.floor(parseFloat(cleanAmount) * factor).toString();

  return onChainAmount;
};
