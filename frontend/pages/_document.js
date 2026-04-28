import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-title" content="Connect" />
        <meta name="application-name" content="Connect" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <style>{`
          #initial-loader {
            position: fixed;
            inset: 0;
            background: #000000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
          }
          .loader-content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .loader-logo {
            width: 6rem;
            height: 6rem;
            background: linear-gradient(to top right, #8B0000, #FF0000);
            border-radius: 2.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            border: 4px solid white;
          }
          .loading-dots {
            display: flex;
            gap: 0.375rem;
            margin-top: 2rem;
          }
          .dot {
            width: 0.375rem;
            height: 0.375rem;
            border-radius: 50%;
            background: #FF0000;
          }
        `}</style>
      </Head>
      <body>
        <div id="initial-loader">
          <div className="loader-content">
            <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
              <div className="loader-logo">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 id="loader-title" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Connect</h2>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#FF0000', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Professional Messaging</p>
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          </div>
        </div>
        {/* Inline script runs before React — prevents flash */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var theme = localStorage.getItem('app-theme') || 'white';
              document.documentElement.setAttribute('data-theme', theme);
              
              // Dynamic loader background adjust based on theme
              var bgColors = { dark: '#000000', white: '#FFFFFF', blue: '#001F3F' };
              var textColors = { dark: '#FFFFFF', white: '#000000', blue: '#FFFFFF' };
              var loader = document.getElementById('initial-loader');
              var title = document.getElementById('loader-title');
              if (loader) loader.style.backgroundColor = bgColors[theme] || '#000000';
              if (title) title.style.color = textColors[theme] || '#FFFFFF';
            })();
          `
        }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
