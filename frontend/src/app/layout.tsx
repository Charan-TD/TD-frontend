import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "./providers/StoreProvider";

export const metadata: Metadata = {
  title: "Train Dabba — Super Admin Portal",
  description: "Train Dabba super admin portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
