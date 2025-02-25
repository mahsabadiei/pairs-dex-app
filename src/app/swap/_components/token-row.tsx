import { Token } from "@lifi/sdk";

const TokenRow = ({
  token,
  onSelect,
  isSelected,
}: {
  token: Token;
  onSelect: (token: Token) => void;
  isSelected: boolean;
}) => {
  return (
    <button
      onClick={() => onSelect(token)}
      className={`w-full p-3 hover:bg-neutral-cream rounded-lg flex items-center justify-between transition-colors ${
        isSelected ? "bg-white-ivory" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {token.logoURI ? (
          <img
            src={token.logoURI}
            alt={token.symbol}
            className="w-8 h-8 rounded-full object-contain"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-primary" />
        )}
        <div className="flex flex-col items-start">
          <span className="font-medium text-black-primary">{token.symbol}</span>
          <span className="text-xs text-neutral-light">{token.name}</span>
        </div>
      </div>
    </button>
  );
};

export default TokenRow;
