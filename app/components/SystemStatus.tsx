import { useEffect, useState } from 'react';
import { FiServer, FiDatabase, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

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
        instantQuery: QueueStats;
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
            } catch (err: any) {
                setError(err?.message || 'An error occurred while fetching system status');
            }
        };

        // İlk yükleme
        fetchStatus();

        // Her 10 saniyede bir güncelle (30 saniye yerine)
        const interval = setInterval(fetchStatus, 10000);

        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold flex items-center gap-2">
                    <FiAlertCircle className="w-5 h-5" />
                    Error loading system status
                </h3>
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-center h-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiServer className="w-6 h-6" />
                    System Status
                </h2>
                <span className="text-sm text-gray-400">
                    Last updated: {new Date(status.timestamp).toLocaleString()}
                </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Redis Status */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FiDatabase className="w-5 h-5" />
                            Redis
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                            status.redis.connected 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                        }`}>
                            {status.redis.connected 
                                ? <><FiCheckCircle /> Connected</> 
                                : <><FiXCircle /> Disconnected</>}
                        </div>
                    </div>
                    {status.redis.info && (
                        <p className="text-gray-400 text-sm mt-2">{status.redis.info}</p>
                    )}
                    {status.redis.error && (
                        <p className="text-red-400 text-sm mt-2">{status.redis.error}</p>
                    )}
                </div>

                {/* Queue Status */}
                {Object.entries(status.queues).map(([name, queue]) => (
                    <div key={name} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FiClock className="w-5 h-5" />
                            {name.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        {queue.error ? (
                            <p className="text-red-400 text-sm">{queue.error}</p>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Active</span>
                                    <span className="text-white font-medium">{queue.active}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Completed</span>
                                    <span className="text-green-400 font-medium">{queue.completed}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Failed</span>
                                    <span className="text-red-400 font-medium">{queue.failed}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Delayed</span>
                                    <span className="text-yellow-400 font-medium">{queue.delayed}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Waiting</span>
                                    <span className="text-blue-400 font-medium">{queue.waiting}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
