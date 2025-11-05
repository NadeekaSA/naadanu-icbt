import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TestDBConnection() {
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    testTables();
  }, []);

  const testTables = async () => {
    setLoading(true);
    setError('');

    try {
      // Try to get list of tables
      const { data, error } = await supabase
        .from('final_performances')
        .select('*')
        .limit(1);

      if (error) {
        setError(`Error accessing final_performances table: ${error.message}`);
        console.error('Full error:', error);
      } else {
        setTables(data || []);
        setError('Table exists and is accessible');
      }
    } catch (err: any) {
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Database Table Test</h2>
      <div className="space-y-4">
        {loading ? (
          <div>Testing connection...</div>
        ) : (
          <>
            {error && (
              <div className="text-red-500 bg-red-50 p-4 rounded">
                {error}
              </div>
            )}
            <div className="text-sm">
              <p>Table Data:</p>
              <pre className="bg-gray-100 p-2 rounded mt-2">
                {JSON.stringify(tables, null, 2)}
              </pre>
            </div>
            <button
              onClick={testTables}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Re-run Test
            </button>
          </>
        )}
      </div>
    </div>
  );
}