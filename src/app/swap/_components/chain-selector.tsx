"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { config } from "@/app/providers";
import { ChevronDown, Search, X } from "lucide-react";
import { debounce } from "lodash";

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
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredChains = useMemo(() => {
    if (!searchQuery) return chains;
    const query = searchQuery.toLowerCase();
    return chains.filter(
      (chain) =>
        chain.name.toLowerCase().includes(query) ||
        chain.id.toString().includes(query)
    );
  }, [chains, searchQuery]);

  const selectedChainInfo = useMemo(
    () => chains.find((chain) => chain.id === selectedChain),
    [chains, selectedChain]
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
    if (chainId !== currentChainId) switchChain({ chainId });
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
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <span className="font-medium">
            {selectedChainInfo?.name || "Select Chain"}
          </span>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-500" />
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
              {filteredChains.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No chains found
                </div>
              ) : (
                <div className="p-2">
                  {filteredChains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleChainSelect(chain.id)}
                      className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{chain.name}</span>
                        <span className="text-sm text-gray-500">
                          Chain ID: {chain.id}
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

export default ChainSelector;
