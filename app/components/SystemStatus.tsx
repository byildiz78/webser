import { useEffect, useState } from 'react';

interface QueueStats {
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
    error?: string;
}

interface SystemStatus {
    timestamp: string;
    redis: {
        connected: boolean;
        info: string | null;
        error: string | null;
    };
    queues: {
        analytics: QueueStats;
        bigQuery: QueueStats;
        rateLimit: QueueStats;
    };
}

export default function SystemStatus() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/status');
                if (!response.ok) {
                    throw new Error('Failed to fetch system status');
                }
                const data = await response.json();
                setStatus(data);
                setError(null);
            } catch (err) {
                setError(err.message);
            }
        };

        // İlk yükleme
        fetchStatus();

        // Her 30 saniyede bir güncelle
        const interval = setInterval(fetchStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="text-red-800 font-semibold">Error loading system status</h3>
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-gray-500">Loading system status...</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold mb-4">System Status</h2>
            
            {/* Redis Status */}
            <div className="mb-4">
                <h3 className="font-medium mb-2">Redis Status</h3>
                <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${status.redis.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={status.redis.connected ? 'text-green-700' : 'text-red-700'}>
                        {status.redis.connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                {status.redis.error && (
                    <p className="text-red-600 text-sm">{status.redis.error}</p>
                )}
            </div>

            {/* Queue Status */}
            <div>
                <h3 className="font-medium mb-2">Queue Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(status.queues).map(([name, queue]) => (
                        <div key={name} className="bg-gray-50 rounded p-3">
                            <h4 className="font-medium mb-2 capitalize">{name} Queue</h4>
                            {queue.error ? (
                                <p className="text-red-600 text-sm">{queue.error}</p>
                            ) : (
                                <div className="space-y-1 text-sm">
                                    <p>Active: <span className="font-medium">{queue.active}</span></p>
                                    <p>Completed: <span className="font-medium">{queue.completed}</span></p>
                                    <p>Failed: <span className="font-medium text-red-600">{queue.failed}</span></p>
                                    <p>Delayed: <span className="font-medium">{queue.delayed}</span></p>
                                    <p>Waiting: <span className="font-medium">{queue.waiting}</span></p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-2 text-right">
                <p className="text-xs text-gray-500">
                    Last updated: {new Date(status.timestamp).toLocaleString()}
                </p>
            </div>
        </div>
    );
}
