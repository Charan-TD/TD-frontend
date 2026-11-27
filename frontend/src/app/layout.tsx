import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";
import { StoreProvider } from "./providers/StoreProvider";
import { MuiProvider } from "./providers/MuiProvider";
import { SessionExpiredToast } from "../features/admin/components/SessionExpiredToast";
import { TooltipLayer } from "../features/admin/components/TooltipLayer";

export const metadata: Metadata = {
  title: "Train Dabba — Super Admin Portal",
  description: "Train Dabba super admin portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MuiProvider>
          <StoreProvider>{children}</StoreProvider>
        </MuiProvider>
        <TooltipLayer />
        <SessionExpiredToast />
      </body>
    </html>
  );
}
