import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '@/lib/AuthContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </ErrorBoundary>
  )
} 