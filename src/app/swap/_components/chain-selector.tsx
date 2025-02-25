"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { config } from "@/app/providers";
import { ChevronDown, Search, X } from "lucide-react";
import { debounce } from "lodash";
import { fetchChains } from "../../../lib/utils/swap";
import { Chain } from "wagmi/chains";

// Define an extended Chain interface that includes our additional properties
interface ExtendedChain extends Chain {
  logoURI?: string;
  isSupported?: boolean;
}

// Chain logos mapping
const CHAIN_LOGOS: Record<number, string> = {
  1: "/images/chains/ethereum.svg",
  137: "/images/chains/polygon.svg",
  42161: "/images/chains/arbitrum.svg",
  10: "/images/chains/optimism.svg",
  // Add more chains as needed
};

// Default placeholder for chain logos
const DEFAULT_CHAIN_LOGO = "/images/chains/default.svg";

interface ChainSelectorProps {
  selectedChain: number;
  onChange: (chainId: number) => void;
}

const ChainSelector = ({ selectedChain, onChange }: ChainSelectorProps) => {
  const { chains } = config;
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Create a new array instead of casting the readonly array
  const [allChains, setAllChains] = useState<ExtendedChain[]>([
    ...chains,
  ] as ExtendedChain[]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all supported chains from LI.FI
  useEffect(() => {
    const getAllChains = async () => {
      try {
        setLoading(true);
        const chainsFromLifi = await fetchChains();

        // Create a new array from the readonly chains
        const combinedChains: ExtendedChain[] = [...chains].map((chain) => {
          const lifiChain = chainsFromLifi.find((c) => c.id === chain.id);

          // Create a properly typed extended chain object
          const extendedChain: ExtendedChain = {
            ...chain,
            logoURI: lifiChain?.logoURI,
            isSupported: !!lifiChain,
          };

          // If LI.FI has a name for this chain, use it
          if (lifiChain?.name) {
            extendedChain.name = lifiChain.name;
          }

          return extendedChain;
        });

        setAllChains(combinedChains);
      } catch (error) {
        console.error("Error fetching chains:", error);
      } finally {
        setLoading(false);
      }
    };

    getAllChains();
  }, [chains]);

  const filteredChains = useMemo(() => {
    if (!searchQuery) return allChains;
    const query = searchQuery.toLowerCase();
    return allChains.filter(
      (chain) =>
        chain.name.toLowerCase().includes(query) ||
        chain.id.toString().includes(query)
    );
  }, [allChains, searchQuery]);

  const selectedChainInfo = useMemo(
    () => allChains.find((chain) => chain.id === selectedChain),
    [allChains, selectedChain]
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

  const handleChainSelect = (chainId: number) => {
    onChange(chainId);
    if (chainId !== currentChainId) {
      try {
        switchChain({ chainId });
      } catch (error) {
        console.error("Error switching chain:", error);
      }
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  // Get chain logo URL
  const getChainLogo = (chainId: number): string => {
    // Try to get logo from chain info
    const chainInfo = allChains.find((chain) => chain.id === chainId);
    if (chainInfo?.logoURI) {
      return chainInfo.logoURI;
    }

    // Fall back to predefined logos
    return CHAIN_LOGOS[chainId] || DEFAULT_CHAIN_LOGO;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <img
          src={getChainLogo(selectedChain)}
          alt={selectedChainInfo?.name || "Chain"}
          className="w-5 h-5 rounded-full object-contain"
          onError={(e) => {
            const imgElement = e.target as HTMLImageElement;
            imgElement.src = DEFAULT_CHAIN_LOGO;
          }}
        />
        <span className="font-medium text-sm">
          {selectedChainInfo?.name || "Select Chain"}
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
                <h3 className="text-lg font-semibold">Select Chain</h3>
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
                  placeholder="Search by name or chain ID"
                  className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">
                    Loading chains...
                  </p>
                </div>
              ) : filteredChains.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No chains found
                </div>
              ) : (
                <div className="p-2 grid grid-cols-1 gap-1">
                  {filteredChains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleChainSelect(chain.id)}
                      className={`w-full p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors ${
                        selectedChain === chain.id ? "bg-gray-100" : ""
                      }`}
                      disabled={chain.isSupported === false}
                    >
                      <img
                        src={getChainLogo(chain.id)}
                        alt={chain.name}
                        className="w-8 h-8 rounded-full object-contain"
                        onError={(e) => {
                          const imgElement = e.target as HTMLImageElement;
                          imgElement.src = DEFAULT_CHAIN_LOGO;
                        }}
                      />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{chain.name}</span>
                        <span className="text-sm text-gray-500">
                          Chain ID: {chain.id}
                        </span>
                      </div>
                      {chain.isSupported === false && (
                        <span className="ml-auto text-xs text-red-500">
                          Not supported
                        </span>
                      )}
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

export default ChainSelector;
