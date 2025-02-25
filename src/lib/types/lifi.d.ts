declare module "@lifi/sdk" {
  export interface SDKConfig {
    integrator: string;
    apiKey?: string;
    routeOptions?: RouteOptions;
    rpcUrls?: Record<number, string[]>;
  }

  export interface RouteOptions {
    slippage?: number;
    order?: string;
    allowSwitchChain?: boolean;
    integrator?: string;
  }

  export function createConfig(config: SDKConfig): void;

  export function getChains(): Promise<any[]>;
  export function getTokens(): Promise<{ tokens: Record<number, Token[]> }>;

  // Get a specific token by chain and address
  export function getToken(
    chainId: number | string,
    tokenAddress: string
  ): Promise<Token>;

  // Corrected token balance functions
  export function getTokenBalance(
    walletAddress: string,
    token: Token
  ): Promise<string>;

  export function getTokenBalances(
    walletAddress: string,
    tokens: Token[]
  ): Promise<Record<string, string>>;

  export function setTokenAllowance(params: {
    walletClient: any;
    token: any;
    spenderAddress: string;
    amount: bigint;
  }): Promise<any>;

  export function getRoutes(params: {
    fromChainId: number;
    fromTokenAddress: string;
    fromAmount: string;
    toChainId: number;
    toTokenAddress: string;
    fromAddress: string;
    options?: RouteOptions;
  }): Promise<RoutesResponse>;

  export function executeRoute(params: {
    route: Route;
    walletClient: any;
    statusManager?: StatusManager;
  }): Promise<any>;

  export class StatusManager {
    subscribe(callback: (status: any) => void): void;
  }

  export interface RoutesResponse {
    routes: Route[];
    unavailableRoutes?: {
      filteredOut?: Array<{ reason: string }>;
      failed?: Array<{
        subpaths: Record<string, Array<{ code: string; message: string }>>;
      }>;
    };
  }

  export interface Route {
    id: string;
    fromAmount: string;
    fromChainId: number;
    fromAmountUSD: string;
    fromToken: Token;
    toAmount: string;
    toAmountMin: string;
    toAmountUSD: string;
    toChainId: number;
    toToken: Token;
    gasCostUSD: string;
    steps: Step[];
  }

  export interface Step {
    id: string;
    type: string;
    tool: string;
    toolDetails: {
      name: string;
      logoURI: string;
    };
    action: object;
    estimate: {
      approvalAddress: string;
      fromAmount: string;
      toAmount: string;
      toAmountMin: string;
      executionDuration: number;
      gasCosts: Array<{
        amount: string;
        amountUSD: string;
        token: Token;
      }>;
    };
  }

  export enum ChainId {
    ETH = 1,
    POL = 137,
    BSC = 56,
    ARB = 42161,
    OPT = 10,
    AVL = 43114,
    FTM = 250,
    GNO = 100,
    SOL = 1399811149,
  }
}

declare module "@lifi/types" {
  export interface BaseToken {
    address: string;
    decimals: number;
    name?: string;
    symbol?: string;
    chainId?: number;
    coinKey?: string;
    logoURI?: string;
  }

  export interface Token extends BaseToken {
    symbol: string;
    name: string;
    chainId: number;
    logoURI?: string;
    priceUSD: string;
  }

  export { ChainId } from "@lifi/sdk";
}

export interface SDKError extends Error {
  code?: string;
  details?: unknown;
  status?: number;
}


/**
 * Interface for swap status updates from LI.FI
 */
export interface SwapStatus {
  // Main status
  status: string;        // 'PENDING', 'DONE', 'FAILED', etc.
  substatus?: string;    // More detailed status information
  // Transaction details
  txHash?: string;       // Transaction hash when available
  txLink?: string;       // Link to block explorer
  chainId?: number;      // Chain where the transaction is happening
  // Tool information
  tool?: string;         // DEX or bridge being used
  name?: string;         // Readable name of the step/tool
  // Progress tracking
  bridgeOrExchangeProgress?: number; // Progress percentage
  currentStep?: number;  // Current step in multi-step swap
  totalSteps?: number;   // Total steps in the swap
  // Error details
  error?: {
    message: string;
    code?: string;
    reason?: string;
  };
  // Estimated values
  gasCostUSD?: string;   // Gas cost in USD
  estimatedDuration?: number; // Estimated duration in seconds
  // Additional fields
  timestamp?: number;    // Timestamp of the status update
  [key: string]: unknown; // Allow for additional properties
}