"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import PriceView from "@/components/price";
import QuoteView from "@/components/quote";
import type { PriceResponse } from "@/lib/utils/types";

function Page() {
  const { address } = useAccount();

  const chainId = useChainId() || 1;
  console.log("chainId: ", chainId);

  const [finalize, setFinalize] = useState(false);
  const [price, setPrice] = useState<PriceResponse | undefined>();
  const [quote, setQuote] = useState();

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-between p-24`}
    >
      {finalize && price ? (
        <QuoteView
          taker={address}
          price={price}
          quote={quote}
          setQuote={setQuote}
          chainId={chainId}
        />
      ) : (
        <PriceView
          taker={address}
          price={price}
          setPrice={setPrice}
          setFinalize={setFinalize}
          chainId={chainId}
        />
      )}
    </div>
  );
}

export default Page;
