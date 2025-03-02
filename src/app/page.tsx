import React from "react";
import SwapForm from "@/app/swap/_components/swap-form";

export default async function Home() {
  return (
    <main>
      <div className="w-full min-h-screen flex items-center justify-center">
        <SwapForm />
      </div>
    </main>
  );
}
