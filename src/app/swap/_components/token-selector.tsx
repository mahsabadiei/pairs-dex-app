"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { debounce } from "lodash";
import { ChevronDown, Search, X, Clock } from "lucide-react";
import { getSupportedTokens } from "@/lib/services/lifi";
import type { Token } from "@lifi/types";
import TokenRow from "@/app/swap/_components/token-row";
import { DEFAULT_CHAIN_LOGO } from "@/lib/utils/constants";

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
  42161: [
    NATIVE_TOKEN_ADDRESS,
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI
  ],
  10: [
    NATIVE_TOKEN_ADDRESS,
    "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC
    "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI
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
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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
          logoURI: `/images/tokens/${
            NATIVE_TOKEN_SYMBOLS[chainId]?.toLowerCase() || "eth"
          }.svg`,
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

  // Handle opening and closing of modal with animations
  const openModal = () => {
    setIsOpen(true);
    setIsClosing(false);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSearchQuery("");
    }, 280); // Slightly less than animation duration
  };

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        closeModal();
      }
    };

    if (isOpen && !isClosing) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      debouncedSearch.cancel();
    };
  }, [isOpen, isClosing, debouncedSearch]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && !isClosing) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isClosing]);

  // Handle token selection
  const handleTokenSelect = (token: Token) => {
    onChange(token.address);
    closeModal();

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

  return (
    <div className="relative">
      <button
        onClick={openModal}
        className="flex items-center gap-2 p-2 bg-neutral-cream rounded-lg hover:bg-white-ivory transition-colors min-w-[120px]"
      >
        {selectedTokenInfo?.logoURI ? (
          <img
            src={selectedTokenInfo.logoURI}
            alt={selectedTokenInfo.symbol}
            className="w-5 h-5 rounded-full object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.src = DEFAULT_CHAIN_LOGO;
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-300" />
        )}
        <span className="font-medium text-sm text-black-primary">
          {selectedTokenInfo?.symbol || "Select Token"}
        </span>
        <ChevronDown className="w-4 h-4 text-neutral-light" />
      </button>

      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-primary/80 backdrop-blur-sm ${
            isClosing ? "animate-fade-out" : "animate-fade-in"
          }`}
          style={{ animationDirection: isClosing ? "reverse" : "normal" }}
        >
          <div
            ref={modalRef}
            className={`bg-white-primary rounded-xl w-full max-w-md max-h-[80vh] flex flex-col ${
              isClosing ? "animate-scale-down" : "animate-scale-up"
            }`}
          >
            <div className="p-4 border-b border-neutral-line">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black-primary">
                  Select Token
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-neutral-cream rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-dark" />
                </button>
              </div>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name or paste address"
                  className="w-full p-3 pr-10 border border-neutral-line rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent text-black-primary"
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-neutral-light absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="w-6 h-6 border-2 border-green-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-neutral-light">
                    Loading tokens...
                  </p>
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-primary">
                  <p>{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-green-primary text-black-primary rounded hover:bg-green-primary/90 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="p-6 text-center text-neutral-light">
                  No tokens found
                </div>
              ) : (
                <div className="p-2">
                  {/* Recent tokens section */}
                  {!searchQuery && recentTokens.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-medium text-neutral-light flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> RECENT
                      </div>
                      <div className="mb-2">
                        {recentTokens.map((token) => (
                          <TokenRow
                            key={`recent-${token.address}`}
                            token={token}
                            onSelect={handleTokenSelect}
                            isSelected={
                              selectedToken.toLowerCase() ===
                              token.address.toLowerCase()
                            }
                          />
                        ))}
                      </div>
                      <div className="border-t border-neutral-line my-2"></div>
                    </div>
                  )}

                  {/* All tokens section */}
                  <div>
                    {!searchQuery && (
                      <div className="px-3 py-2 text-xs font-medium text-neutral-light">
                        ALL TOKENS
                      </div>
                    )}
                    <div>
                      {filteredTokens.map((token) => (
                        <TokenRow
                          key={`token-${token.address}`}
                          token={token}
                          onSelect={handleTokenSelect}
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

export default TokenSelector;
