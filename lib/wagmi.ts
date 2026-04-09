import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, foundry } from "wagmi/chains";

const chains =
  process.env.NODE_ENV === "development" ? [foundry, baseSepolia] : [baseSepolia];

export const config = getDefaultConfig({
  appName: "Onchain Ticketing",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: chains as any,
  ssr: true,
});
