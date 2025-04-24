// app/layout.tsx
import React, { ReactNode } from 'react';
import Footer from '../components/Footer'; 
import './globals.css'; 

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-gray-100"> 
      
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}