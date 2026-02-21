import '@mantine/core/styles.css';
import './globals.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';

export const metadata = {
    title: 'SQL Agent - Next.js AI Schema architect',
    description: 'Metadata-first Text-to-SQL Web System',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <ColorSchemeScript />
            </head>
            <body>
                <MantineProvider defaultColorScheme="dark">{children}</MantineProvider>
            </body>
        </html>
    );
}
