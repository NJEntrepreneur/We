import React from 'react';

export const metadata = {
  title: 'Platform Docs',
  description: 'Developer Platform Documentation',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
