import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#6B73FF" />
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "9844a8d0-4dbb-40a7-aa57-2a0de509b4e1",
                safari_web_id: "web.onesignal.auto.428d294a-5ce2-44bb-bee0-dec3149a5564",
                notifyButton: {
                  enable: true,
                },
              });
            });
          `
        }} />
        <style>{`
          #initial-loader {
            position: fixed;
            inset: 0;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: opacity 0.5s ease-out, visibility 0.5s;
          }
          .loader-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeIn 0.8s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .loader-ring {
            position: absolute;
            inset: -20px;
            border-radius: 3rem;
            border: 2px solid rgba(107, 115, 255, 0.2);
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          @keyframes ping {
            75%, 100% { transform: scale(1.5); opacity: 0; }
          }
          .loader-logo {
            width: 6rem;
            height: 6rem;
            background: linear-gradient(to top right, #4f46e5, #6366f1);
            border-radius: 2.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            position: relative;
            overflow: hidden;
            border: 4px solid white;
          }
          .loader-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent);
            transform: translateX(-100%) skewX(-15deg);
            animation: shimmer 2s infinite;
          }
          @keyframes shimmer {
            100% { transform: translateX(200%) skewX(-15deg); }
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
            background: #4f46e5;
            animation: bounce 0.6s infinite alternate;
          }
          @keyframes bounce {
            to { transform: translateY(-4px); opacity: 0.5; }
          }
        `}</style>
      </Head>
      <body className="antialiased">
        <div id="initial-loader">
          <div className="loader-content">
            <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
              <div className="loader-ring"></div>
              <div className="loader-logo">
                <div className="loader-shimmer"></div>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>Campus Chat</h2>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Connecting Communities</p>
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot" style={{ animationDelay: '0.2s' }}></div>
                <div className="dot" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
        <Main />
        <NextScript />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              const loader = document.getElementById('initial-loader');
              if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                  loader.style.visibility = 'hidden';
                }, 500);
              }
            });
          `
        }} />
      </body>
    </Html>
  )
}
