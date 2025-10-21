export const metadata = {
  title: 'Burning Bear — Live Burn Camp',
  description: 'Meet The Burning Bear — the classiest arsonist in crypto.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b1712] text-[#f7efe2] antialiased">{children}</body>
    </html>
  );
}
