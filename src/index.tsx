/**
 * ZOE Solar Accounting OCR - Main Entry Point
 * Integrates: Error Boundaries, Context, Monitoring, Security
 */

import React, { Suspense, StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Components
import { ErrorBoundary, setupGlobalErrorHandler } from './components/ErrorBoundary';

// Context
import { AppProvider } from './context/AppContext';

// Services & Monitoring
import { performSecurityCheck } from './middleware/security';
import { loadEnvConfig, logConfigSummary, getEnvironmentConfig } from './config/env';
import { analytics } from './lib/analytics';

// Styles
import './styles/global.css';
import './styles/typography.css';

// Components (lazy loaded for performance)
const App = React.lazy(() => import('./App'));

// Initialize security first
performSecurityCheck();

// Setup global error handlers
setupGlobalErrorHandler();

// Log config (dev only)
logConfigSummary();

// Load environment config
const envConfig = loadEnvConfig();
const envMeta = getEnvironmentConfig();

// Setup performance monitoring
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const start = performance.now();
  try {
    const response = await originalFetch(...args);
    const duration = performance.now() - start;

    // Track API calls
    if (args[0].toString().includes('api')) {
      analytics.track('api_call', {
        url: args[0],
        duration: Math.round(duration),
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    const duration = performance.now() - start;
    console.error('Fetch error:', error, {
      url: args[0],
      duration: Math.round(duration),
    });
    throw error;
  }
};

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);
        analytics.track('service_worker_registered', {
          scope: registration.scope,
        });

        // Register periodic sync if supported
        if ('periodicSync' in registration) {
          (
            registration as ServiceWorkerRegistration & {
              periodicSync: {
                register: (tag: string, options: { minInterval: number }) => Promise<void>;
              };
            }
          ).periodicSync
            .register('content-sync', {
              minInterval: 15 * 60 * 1000, // 15 minutes
            })
            .catch(() => {
              // Periodic sync not supported or permission denied
            });
        }
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
        analytics.track('service_worker_error', {
          error: error.message,
        });
      });
  });
}

// Root component wrapper
function Root() {
  useEffect(() => {
    // Track app load
    analytics.track('app_loaded', {
      version: envConfig.appVersion,
      environment: envMeta.environment,
    });

    // Track user agent
    analytics.track('user_agent', {
      ua: navigator.userAgent,
      platform: navigator.platform,
    });

    // Send performance metrics
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      analytics.trackPerformance('page_load', navTiming.loadEventEnd - navTiming.fetchStart);
    }

    // Cleanup on unload
    const handleUnload = () => {
      analytics.flush();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0A0E14',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: '#0066FF',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            ></div>
            <p style={{ color: '#E8ECF0', fontSize: '16px' }}>Lade ZOE Solar Accounting OCR...</p>
            <p style={{ color: '#5F6775', fontSize: '12px', marginTop: '8px' }}>
              Version {envConfig.appVersion || 'dev'}
            </p>
          </div>
        </div>
      }
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Suspense>
  );
}

// Mount app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element');
}

const root = ReactDOM.createRoot(rootElement);

// Render with Context and Security
root.render(
  <StrictMode>
    <AppProvider>
      <Root />
    </AppProvider>
  </StrictMode>
);

// Export for testing
export { Root };
