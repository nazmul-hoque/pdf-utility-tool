import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowPDF | Premium PDF Utility Suite',
  description: 'FlowPDF is a premium, all-in-one PDF utility tool. Merge, split, compress, convert, create, watermark, and batch process PDF files with an elegant and blazingly fast interface.',
  metadataBase: new URL('https://flow.withcloud.io'),
  keywords: ['PDF', 'PDF utility', 'merge PDF', 'split PDF', 'compress PDF', 'convert PDF', 'create PDF', 'watermark PDF', 'FlowPDF', 'AeroPdf', 'PDF Editor'],
  authors: [{ name: 'FlowPDF' }],
  creator: 'FlowPDF',
  publisher: 'FlowPDF',
  generator: 'Next.js',
  openGraph: {
    title: 'FlowPDF | Premium PDF Utility Suite',
    description: 'Merge, split, compress, convert, create, watermark, and batch process PDF files with an elegant and blazingly fast interface.',
    url: 'https://flow.withcloud.io',
    siteName: 'FlowPDF',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowPDF | Premium PDF Utility Suite',
    description: 'Merge, split, compress, convert, create, watermark, and batch process PDF files with an elegant and blazingly fast interface.',
  },
  alternates: {
    canonical: '/',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
