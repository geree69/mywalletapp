import './globals.css';
import { AppProvider } from './context/AppContext';

export const metadata = {
  title: 'MyWalletApp',
  description: 'Tu gestor financiero personal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-[#08080c] text-[#F3F3F6] h-full overflow-hidden flex items-center justify-center antialiased m-0">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}