import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function HealthCheck() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const baseUrl = apiUrl.replace('/api', '');
        
        const response = await fetch(`${baseUrl}/health/detailed`);
        const data = await response.json();
        
        setStatus({
          success: response.ok,
          data,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        setStatus({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <>
      <Head>
        <title>Health Check | Campus Chat</title>
      </Head>

      <div className="min-h-screen bg-app p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">System Health Check</h1>

          {loading ? (
            <div className="bg-surface rounded-lg shadow p-8 text-center">
              <div className="rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking system status...</p>
            </div>
          ) : status?.success ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-green-900 mb-4">✓ System Operational</h2>
                <p className="text-green-700">All systems are functioning correctly.</p>
              </div>

              <div className="bg-surface rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Environment Variables</h3>
                <div className="space-y-2">
                  {Object.entries(status.data.env || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b">
                      <span className="font-mono text-sm">{key}</span>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {value ? '✓ Set' : '✗ Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Database Status</h3>
                <div className="flex justify-between items-center">
                  <span>Connection Status</span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    status.data.database?.status === 'connected'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.data.database?.status === 'connected' ? '✓ Connected' : '✗ Failed'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-2">Next Steps</h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-700">
                  <li>Go to <a href="/register" className="underline font-bold">/register</a> to create an account</li>
                  <li>Use a KTU email (@stu.ktu.edu.gh, @staff.ktu.edu.gh, or @ktu.edu.gh)</li>
                  <li>Go to <a href="/login" className="underline font-bold">/login</a> to sign in</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-red-900 mb-4">✗ System Error</h2>
                <p className="text-red-700 mb-4">
                  {status?.error || 'Backend is not responding'}
                </p>
                <div className="bg-red-100 rounded p-4 font-mono text-sm text-red-800 overflow-auto">
                  {status?.error || 'Unable to connect to backend API'}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-yellow-900 mb-2">Troubleshooting</h3>
                <ol className="list-decimal list-inside space-y-2 text-yellow-700">
                  <li>Ensure backend is running: <code className="bg-yellow-100 px-2 py-1 rounded">npm start</code></li>
                  <li>Check backend logs for errors</li>
                  <li>Verify NEXT_PUBLIC_API_URL environment variable</li>
                  <li>Run backend diagnostic: <code className="bg-yellow-100 px-2 py-1 rounded">npm run db:diagnose</code></li>
                </ol>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-app-secondary text-sm">
            <p>Last checked: {status?.timestamp}</p>
            <p>
              <a href="/" className="text-blue-600 hover:underline">Back to home</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
