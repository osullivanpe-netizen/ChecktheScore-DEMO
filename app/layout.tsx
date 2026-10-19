import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Check the Score — Environment Proof",
  description: "Environment deliverable: proving the stack is wired up and working.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
