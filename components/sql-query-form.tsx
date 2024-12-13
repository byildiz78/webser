'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SQLConfig } from '@/types/config';
import axios from 'axios';
import { ApiResponse } from '@/types/tables';

interface SqlQueryFormProps {
  selectedDatabase?: SQLConfig;
}

export function SqlQueryForm({
  selectedDatabase
}: SqlQueryFormProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const itemsPerPage = 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post<ApiResponse<any>>(
        `/api/${selectedDatabase?.databaseId}/query`,
        { query },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${selectedDatabase?.apiKey}`,
          }
        }
      );

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || 'Query execution failed');
      }
      setResult(response.data.data);
      setTotalResults(response.data.totalRows);
      setCurrentPage(1);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const totalPages = Math.ceil((result?.length || 0) / itemsPerPage);
  const paginatedResults = result?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium mb-2">
            SQL Query
          </label>
          <Textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            className="min-h-[100px]"
            required
          />
        </div>

        <Button disabled={loading || !selectedDatabase?.apiKey} onClick={handleSubmit}>
          {loading ? 'Executing...' : 'Execute Query'}
        </Button>

        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}

        {result && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Results</h3>
              <span className="text-sm text-gray-500">Total Results: {totalResults}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(result[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedResults?.map((row: any, i: number) => (
                    <tr key={i}>
                      {Object.values(row).map((value: any, j: number) => (
                        <td
                          key={j}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
