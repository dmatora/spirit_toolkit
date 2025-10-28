import './global.css';
import GlobalLayoutClient from './global/GlobalLayoutClient';
import { StyledComponentsRegistry } from './registry';

export const metadata = {
  title: 'Spirit Toolkit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <StyledComponentsRegistry>
          <GlobalLayoutClient>{children}</GlobalLayoutClient>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
