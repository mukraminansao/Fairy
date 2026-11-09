import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BackHistory } from "./back-history";
import "@fontsource-variable/newsreader/standard.css";
import "@fontsource-variable/newsreader/standard-italic.css";
import "@fontsource-variable/manrope";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAIRY | Fashion, beauty and curated looks",
  description: "Explore fashion and beauty through shoppable looks, curated rituals, and pieces that feel like you.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><BackHistory />{children}</body>
    </html>
  );
}
