"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getSupportedTokens } from "@/lib/utils/swap";
import type { Token } from "@lifi/types";
import { debounce } from "lodash";
import { ChevronDown, Search, X } from "lucide-react";

const DEFAULT_TOKENS: Record<number, string> = {
  1: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH for chain 1
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // MATIC for chain 137
};

interface TokenSelectorProps {
  chainId: number;
  selectedToken: string;
  onChange: (token: string) => void;
}

const getNativeToken = (chainId: number): Token => ({
  address: DEFAULT_TOKENS[chainId],
  symbol: chainId === 1 ? "ETH" : "MATIC",
  decimals: 18,
  name: chainId === 1 ? "Ethereum" : "Polygon",
  chainId,
  priceUSD: "0",
  logoURI: "",
});

const TokenSelector = ({
  chainId,
  selectedToken,
  onChange,
}: TokenSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchQuery("");

    getSupportedTokens(chainId)
      .then((tokenList) => {
        const allTokens = [
          getNativeToken(chainId),
          ...tokenList.filter(
            (token) =>
              token.address &&
              token.symbol &&
              token.decimals !== undefined &&
              token.name
          ),
        ];

        setTokens(allTokens);
      })
      .catch(() => setTokens([]));
  }, [chainId]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens;
    const query = searchQuery.toLowerCase();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  const selectedTokenInfo = useMemo(
    () =>
      tokens.find(
        (token) =>
          token?.address?.toLowerCase() === selectedToken?.toLowerCase()
      ),
    [tokens, selectedToken]
  );

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );

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

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleTokenSelect = (token: Token) => {
    onChange(token.address);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-3 bg-white border rounded-lg flex items-center justify-between hover:border-blue-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          {selectedTokenInfo?.logoURI ? (
            <img
              src={selectedTokenInfo.logoURI}
              alt={selectedTokenInfo.symbol}
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                const imgElement = e.target as HTMLImageElement;
                imgElement.src = "/placeholder-token.png";
              }}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200" />
          )}
          <span className="font-medium">
            {selectedTokenInfo?.symbol || "Select Token"}
          </span>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
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
              {filteredTokens.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No tokens found
                </div>
              ) : (
                <div className="p-2">
                  {filteredTokens.map((token) => (
                    <button
                      key={`${chainId}-${token.address}`}
                      onClick={() => handleTokenSelect(token)}
                      className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                    >
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            imgElement.src = "/placeholder-token.png";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                      )}
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-sm text-gray-500">
                          {token.name}
                        </span>
                      </div>
                    </button>
                  ))}
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
