"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { debounce } from "lodash";
import { ChevronDown, Search, X, Clock } from "lucide-react";
import { getSupportedTokens, fetchTokenBalance } from "@/lib/utils/swap";
import type { Token } from "@lifi/types";
import { useAccount } from "wagmi";

// Native token address
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Default token symbols by chain
const NATIVE_TOKEN_SYMBOLS: Record<number, string> = {
  1: "ETH",
  137: "MATIC",
  42161: "ETH",
  10: "ETH",
  // Add more chains as needed
};

// Common tokens (to show first in the list)
const COMMON_TOKENS: Record<number, string[]> = {
  1: [
    NATIVE_TOKEN_ADDRESS,
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
  ],
  137: [
    NATIVE_TOKEN_ADDRESS,
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", // DAI
  ],
  // Add more chains as needed
};

interface TokenSelectorProps {
  chainId: number;
  selectedToken: string;
  onChange: (token: string) => void;
}

const TokenSelector = ({
  chainId,
  selectedToken,
  onChange,
}: TokenSelectorProps) => {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentTokens, setRecentTokens] = useState<Token[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load tokens when chain changes
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        setError(null);
        setSearchQuery("");

        // Get native token for this chain
        const nativeToken: Token = {
          address: NATIVE_TOKEN_ADDRESS,
          symbol: NATIVE_TOKEN_SYMBOLS[chainId] || "ETH",
          decimals: 18,
          name: NATIVE_TOKEN_SYMBOLS[chainId] === "ETH" ? "Ethereum" : "Matic",
          chainId,
          priceUSD: "0",
          logoURI: `/images/tokens/${NATIVE_TOKEN_SYMBOLS[
            chainId
          ].toLowerCase()}.svg`,
        };

        // Get all tokens for this chain
        const tokenList = await getSupportedTokens(chainId);

        // Filter out tokens with missing info
        const validTokens = tokenList.filter(
          (token) =>
            token?.address &&
            token?.symbol &&
            token?.decimals !== undefined &&
            token?.name
        );

        // Add native token to the list
        const allTokens = [nativeToken, ...validTokens];

        setTokens(allTokens);

        // Load recent tokens from localStorage
        const storedRecent = localStorage.getItem(`recent-tokens-${chainId}`);
        if (storedRecent) {
          try {
            const recentAddresses = JSON.parse(storedRecent) as string[];
            const recentTokensList = recentAddresses
              .map((addr) =>
                allTokens.find(
                  (t) => t.address.toLowerCase() === addr.toLowerCase()
                )
              )
              .filter(Boolean) as Token[];
            setRecentTokens(recentTokensList);
          } catch (e) {
            console.error("Error parsing recent tokens:", e);
          }
        }
      } catch (err) {
        console.error("Error loading tokens:", err);
        setError("Failed to load tokens. Please try again.");
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [chainId]);

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery) {
      // If no search query, prioritize common tokens
      const commonAddresses = COMMON_TOKENS[chainId] || [];
      const commonTokens = tokens.filter((token) =>
        commonAddresses.includes(token.address)
      );

      // Then show all other tokens
      const otherTokens = tokens.filter(
        (token) => !commonAddresses.includes(token.address)
      );

      return [...commonTokens, ...otherTokens];
    }

    // If there's a search query, filter based on it
    const query = searchQuery.toLowerCase();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery, chainId]);

  // Get the selected token info
  const selectedTokenInfo = useMemo(
    () =>
      tokens.find(
        (token) =>
          token?.address?.toLowerCase() === selectedToken?.toLowerCase()
      ),
    [tokens, selectedToken]
  );

  // Debounce search input
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      debouncedSearch.cancel();
    };
  }, [isOpen, debouncedSearch]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    onChange(token.address);
    setIsOpen(false);
    setSearchQuery("");

    // Save to recent tokens
    const recentAddresses = recentTokens.map((t) => t.address);
    if (!recentAddresses.includes(token.address)) {
      const updatedRecent = [token.address, ...recentAddresses].slice(0, 5);
      localStorage.setItem(
        `recent-tokens-${chainId}`,
        JSON.stringify(updatedRecent)
      );
    }
  };

  // Get token balance (for display)
  const getTokenBalance = async (token: Token) => {
    if (!address) return null;

    try {
      // The correct parameter order is (walletAddress, token)
      const balance = await fetchTokenBalance(address, token);

      const displayBalance = parseFloat(balance) / 10 ** token.decimals;
      return displayBalance.toLocaleString(undefined, {
        maximumFractionDigits: 4,
        minimumFractionDigits: 0,
      });
    } catch (err) {
      console.error(`Error fetching balance for ${token.symbol}:`, err);
      return null;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-w-[120px]"
      >
        {selectedTokenInfo?.logoURI ? (
          <img
            src={selectedTokenInfo.logoURI}
            alt={selectedTokenInfo.symbol}
            className="w-5 h-5 rounded-full object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.src = `/images/tokens/generic.svg`;
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-200" />
        )}
        <span className="font-medium text-sm">
          {selectedTokenInfo?.symbol || "Select Token"}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select Token</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name or paste address"
                  className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">
                    Loading tokens...
                  </p>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-500">
                  <p>{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No tokens found
                </div>
              ) : (
                <div className="p-2">
                  {/* Recent tokens section */}
                  {!searchQuery && recentTokens.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> RECENT
                      </div>
                      <div className="mb-2">
                        {recentTokens.map((token) => (
                          <TokenRow
                            key={`recent-${token.address}`}
                            token={token}
                            onSelect={handleTokenSelect}
                            getBalance={getTokenBalance}
                            isSelected={
                              selectedToken.toLowerCase() ===
                              token.address.toLowerCase()
                            }
                          />
                        ))}
                      </div>
                      <div className="border-t my-2"></div>
                    </div>
                  )}

                  {/* All tokens section */}
                  <div>
                    {!searchQuery && (
                      <div className="px-3 py-2 text-xs font-medium text-gray-500">
                        ALL TOKENS
                      </div>
                    )}
                    <div>
                      {filteredTokens.map((token) => (
                        <TokenRow
                          key={`token-${token.address}`}
                          token={token}
                          onSelect={handleTokenSelect}
                          getBalance={getTokenBalance}
                          isSelected={
                            selectedToken.toLowerCase() ===
                            token.address.toLowerCase()
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Token row component (for cleaner code)
interface TokenRowProps {
  token: Token;
  onSelect: (token: Token) => void;
  getBalance: (token: Token) => Promise<string | null>;
  isSelected: boolean;
}

const TokenRow: React.FC<TokenRowProps> = ({
  token,
  onSelect,
  getBalance,
  isSelected,
}) => {
  const { address } = useAccount();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load balance when component mounts
  useEffect(() => {
    if (address) {
      setLoading(true);
      getBalance(token)
        .then((bal) => setBalance(bal))
        .finally(() => setLoading(false));
    }
  }, [address, token, getBalance]);

  return (
    <button
      onClick={() => onSelect(token)}
      className={`w-full p-3 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors ${
        isSelected ? "bg-gray-100" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="w-8 h-8 rounded-full object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.src = `/images/tokens/generic.svg`;
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200" />
        )}
        <div className="flex flex-col items-start">
          <span className="font-medium">{token.symbol}</span>
          <span className="text-xs text-gray-500">{token.name}</span>
        </div>
      </div>

      {address && (
        <div className="text-right">
          {loading ? (
            <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin ml-auto"></div>
          ) : (
            balance && <span className="text-sm">{balance}</span>
          )}
        </div>
      )}
    </button>
  );
};

export default TokenSelector;
