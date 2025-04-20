// app/layout.tsx
import React, { ReactNode } from 'react';
import Footer from '../components/Footer'; // Use the SAME correct import path
import './globals.css'; // If you have global styles

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-gray-100"> {/* Example body styling */}
      
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}