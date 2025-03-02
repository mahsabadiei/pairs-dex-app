"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { ChevronDown, Search, X } from "lucide-react";
import { debounce } from "lodash";
import { fetchChains } from "@/lib/utils/swap";

// Define an extended Chain interface that includes our additional properties
interface ExtendedChain {
  id: number;
  name: string;
  logoURI?: string;
  isSupported?: boolean;
}

// Default placeholder for chain logos
const DEFAULT_CHAIN_LOGO = "/images/quoteView.png";

interface ChainSelectorProps {
  selectedChain: number;
  onChange: (chainId: number) => void;
}

const ChainSelector = ({ selectedChain, onChange }: ChainSelectorProps) => {
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allChains, setAllChains] = useState<ExtendedChain[]>([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all supported chains from LI.FI
  useEffect(() => {
    const getAllChains = async () => {
      try {
        setLoading(true);
        const chainsFromLifi = await fetchChains();

        // Map chains to our ExtendedChain format
        const formattedChains: ExtendedChain[] = chainsFromLifi.map((chain) => ({
          id: chain.id,
          name: chain.name,
          logoURI: chain.logoURI,
          isSupported: true,
        }));

        setAllChains(formattedChains);
      } catch (error) {
        console.error("Error fetching chains:", error);
      } finally {
        setLoading(false);
      }
    };

    getAllChains();
  }, []);

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

  useEffect(() => {
    if (isOpen && searchInputRef.current && !isClosing) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isClosing]);

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

  const handleChainSelect = (chainId: number) => {
    onChange(chainId);
    if (chainId !== currentChainId) {
      try {
        switchChain({ chainId });
      } catch (error) {
        console.error("Error switching chain:", error);
      }
    }
    closeModal();
  };

  // Get chain logo URL
  const getChainLogo = (chainId: number): string => {
    // Try to get logo from chain info
    const chainInfo = allChains.find((chain) => chain.id === chainId);
    if (chainInfo?.logoURI) {
      return chainInfo.logoURI;
    }

    // Fall back to default
    return DEFAULT_CHAIN_LOGO;
  };

  return (
    <div className="relative">
      <button
        onClick={openModal}
        className="flex items-center gap-2 p-2 bg-neutral-cream rounded-lg hover:bg-white-ivory transition-colors"
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
        <span className="font-medium text-sm text-black-primary">
          {selectedChainInfo?.name || "Select Chain"}
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
                  Select Chain
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
                  placeholder="Search by name or chain ID"
                  className="w-full p-3 pr-10 border border-neutral-line rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent text-black-primary"
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <Search className="w-5 h-5 text-neutral-light absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="w-6 h-6 border-2 border-green-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-neutral-light">
                    Loading chains...
                  </p>
                </div>
              ) : filteredChains.length === 0 ? (
                <div className="p-4 text-center text-neutral-light">
                  No chains found
                </div>
              ) : (
                <div className="p-2 grid grid-cols-1 gap-1">
                  {filteredChains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleChainSelect(chain.id)}
                      className={`w-full p-3 hover:bg-neutral-cream rounded-lg flex items-center gap-3 transition-colors ${
                        selectedChain === chain.id ? "bg-white-ivory" : ""
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
                        <span className="font-medium text-black-primary">
                          {chain.name}
                        </span>
                        <span className="text-sm text-neutral-light">
                          Chain ID: {chain.id}
                        </span>
                      </div>
                      {chain.isSupported === false && (
                        <span className="ml-auto text-xs text-red-primary">
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