import "./globals.css";
import { AppProvider } from "./context/AppContext";

export const metadata = {
  title: "Financial Care",
  description: "Contabilidad personal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="w-full max-w-[420px] bg-[var(--paper)] rounded-[24px] overflow-hidden flex flex-col relative border border-[var(--paper-line)] shadow-2xl my-6 min-h-[780px]">
          <AppProvider>
            {children}
          </AppProvider>
        </div>
      </body>
    </html>
  );
}