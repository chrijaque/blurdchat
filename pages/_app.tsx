import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '@/lib/AuthContext'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  )
} 