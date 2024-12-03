import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Blurd.chat
            </Link>
            <nav className="flex items-center space-x-4">
              {user && (
                <>
                  <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                    Profil
                  </Link>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                Vilkår
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Om Blurd.chat</h3>
              <p className="text-gray-600">
                En sikker platform for at møde nye mennesker gennem video chat.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                    Vilkår og betingelser
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                    Privatlivspolitik
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-gray-900">
                    Kontakt
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Kontakt os</h3>
              <p className="text-gray-600">
                Har du spørgsmål eller feedback?
                <br />
                <a href="mailto:support@blurd.chat" className="text-blue-600 hover:text-blue-700">
                  support@blurd.chat
                </a>
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Blurd.chat. Alle rettigheder forbeholdes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 