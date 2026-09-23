import "./globals.css";

export const metadata = {
  title: "Sync",
  description: "Close the distance, one day at a time.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
