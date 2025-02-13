import { 
  type Route,
  getRoutes, 
  getTokens, 
  executeRoute 
} from '@lifi/sdk';
import { ethers } from 'ethers';

export interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}

export const getSupportedTokens = async (chainId: number) => {
  const tokens = await getTokens();
  return tokens.tokens[chainId];
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
    // Check for specific error cases in unavailableRoutes
    if (routes.unavailableRoutes) {
      if (routes.unavailableRoutes.filteredOut?.length > 0) {
        const reason = routes.unavailableRoutes.filteredOut[0].reason;
        throw new Error(`Route filtered out: ${reason}`);
      }
      
      if (routes.unavailableRoutes.failed?.length > 0) {
        const failedRoute = routes.unavailableRoutes.failed[0];
        const subpathErrors = Object.values(failedRoute.subpaths)[0];
        
        if (subpathErrors?.length > 0) {
          // Find the most relevant error
          const relevantError = subpathErrors.find(error => 
            error.code === 'AMOUNT_TOO_HIGH' || 
            error.code === 'NO_POSSIBLE_ROUTE' ||
            error.message.includes('Insufficient liquidity')
          );

          if (relevantError) {
            if (relevantError.code === 'AMOUNT_TOO_HIGH') {
              throw new Error('Amount is too high for this swap');
            } else if (relevantError.message.includes('Insufficient liquidity')) {
              throw new Error('Insufficient liquidity for this swap');
            } else {
              throw new Error('No possible route found for this swap');
            }
          }
        }
      }
    }
    
    throw new Error('No available routes found for this swap');
  }

  return routes.routes[0]; // Return best route
};

export const executeSwap = async (route: Route) => {
  if (!window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  // Create Web3Provider from window.ethereum
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return await executeRoute({
    route: route,
    signer: signer,
    infiniteApproval: false // Set to true if you want infinite approval
  });
};