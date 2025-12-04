import type { Metadata } from "next";
import { Anonymous_Pro, Montserrat } from "next/font/google";
import "./globals.css";

const anonymousPro = Anonymous_Pro({
  variable: "--font-anonymous-pro",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TCG Dashboard",
  description: "Internal KPI dashboard for TCG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${anonymousPro.variable} ${montserrat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
