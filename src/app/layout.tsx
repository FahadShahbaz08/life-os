import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AuthProvider from '@/components/providers/AuthProvider';
import NotificationManager from '@/components/notifications/NotificationManager';

export const metadata: Metadata = {
  title: 'Life OS — Personal Life Operating System',
  description: 'Your external brain. Capture, organize, prioritize, and review every area of your life.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <AuthProvider>
          <ThemeProvider>
            <AppProvider>
              <ToastProvider>
                <NotificationManager />
                {children}
              </ToastProvider>
            </AppProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
