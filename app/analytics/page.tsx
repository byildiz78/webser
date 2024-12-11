'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    FiHome, 
    FiTrash2, 
    FiLogOut, 
    FiClock, 
    FiActivity,
    FiCheckCircle
} from 'react-icons/fi';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    createColumnHelper,
    flexRender,
    type SortingState,
    type ColumnDef
} from '@tanstack/react-table';
import SystemStatus from '../components/SystemStatus';

interface LogEntry {
    id: string;
    request_timestamp: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    query_text: string | null;
    job_id: string | null;
    job_status: string | null;
    error_message: string | null;
}

interface RateLimit {
    path: string;
    limit: number;
    window: string;
    description: string;
    used: number;
    remaining: number;
}

interface RateLimitData {
    defaultLimit: number;
    defaultWindow: string;
    limits: RateLimit[];
}

const columnHelper = createColumnHelper<LogEntry>();

const columns = [
    columnHelper.accessor('request_timestamp', {
        header: 'Tarih',
        cell: info => format(new Date(info.getValue()), 'dd.MM.yyyy HH:mm:ss'),
        sortingFn: 'datetime'
    }),
    columnHelper.accessor('endpoint', {
        header: 'Endpoint',
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('method', {
        header: 'Method',
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('status_code', {
        header: 'Durum',
        cell: info => (
            <span className={`px-2 py-1 rounded-full text-sm ${
                info.getValue() < 400 ? 'bg-green-100 text-green-800' :
                info.getValue() < 500 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
            }`}>
                {info.getValue()}
            </span>
        ),
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('response_time_ms', {
        header: 'Yanıt Süresi',
        cell: info => {
            const seconds = info.getValue() / 1000;
            return (
                <span className={seconds >= 10 ? 'text-red-600 font-semibold' : ''}>
                    {seconds.toFixed(2)} sn
                </span>
            );
        },
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('query_text', {
        header: 'Sorgu',
        cell: info => info.getValue() || '-',
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('job_id', {
        header: 'İş No',
        cell: info => info.getValue() || '-',
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('job_status', {
        header: 'İş Durumu',
        cell: info => {
            const status = info.getValue();
            if (!status) return '-';
            const statusMap: Record<string, string> = {
                'completed': 'Tamamlandı',
                'failed': 'Başarısız',
                'pending': 'Bekliyor',
                'processing': 'İşleniyor'
            };
            return statusMap[status.toLowerCase()] || status;
        },
        sortingFn: 'alphanumeric'
    }),
    columnHelper.accessor('error_message', {
        header: 'Hata',
        cell: info => info.getValue() || '-',
        sortingFn: 'alphanumeric'
    }),
] as ColumnDef<LogEntry>[];

const AnalyticsPage = () => {
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
    const [loading, setLoading] = useState(false);
    const [clearingLogs, setClearingLogs] = useState(false);
    const [data, setData] = useState<any>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [rateLimits, setRateLimits] = useState<RateLimitData | null>(null);
    const router = useRouter();

    const table = useReactTable({
        data: data?.allLogs || [],
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const handleLogout = () => {
        localStorage.removeItem('analytics_api_key');
        setIsAuthorized(false);
        router.push('/');
    };

    const verifyApiKey = async (key: string) => {
        try {
            const response = await fetch('/api/analytics?range=today', {
                headers: {
                    'x-api-key': key
                }
            });
            
            if (response.ok) {
                setApiKey(key);
                setIsAuthorized(true);
                localStorage.setItem('analytics_api_key', key);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error verifying API key:', error);
            return false;
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/analytics?range=${dateRange}`, {
                headers: {
                    'x-api-key': apiKey
                }
            });
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            if (error instanceof Error && error.message.includes('Unauthorized')) {
                setIsAuthorized(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = async () => {
        if (!window.confirm('Bu işlem tüm logları kalıcı olarak silecektir. Emin misiniz?')) {
            return;
        }

        setClearingLogs(true);
        try {
            const response = await fetch('/api/analytics', {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey
                }
            });
            
            if (response.ok) {
                alert('Loglar başarıyla temizlendi');
                fetchData();
            } else {
                alert('Loglar temizlenirken bir hata oluştu');
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            alert('Loglar temizlenirken bir hata oluştu');
        } finally {
            setClearingLogs(false);
        }
    };

    useEffect(() => {
        const savedApiKey = localStorage.getItem('analytics_api_key');
        if (savedApiKey) {
            verifyApiKey(savedApiKey);
        }
    }, []);

    useEffect(() => {
        if (isAuthorized) {
            fetchData();
        }
    }, [dateRange, isAuthorized]);

    useEffect(() => {
        const fetchRateLimits = async () => {
            try {
                const res = await fetch('/api/rate-limits');
                const data = await res.json();
                setRateLimits(data);
            } catch (error) {
                console.error('Rate limit bilgileri alınamadı:', error);
            }
        };

        fetchRateLimits();
    }, []);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white">
                            Analytics Dashboard
                        </h2>
                        <p className="mt-2 text-gray-400">
                            Devam etmek için API anahtarınızı girin
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    API Anahtarı
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                                    placeholder="API anahtarınızı girin"
                                />
                            </div>
                            <button
                                onClick={() => verifyApiKey(apiKey)}
                                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                Giriş Yap
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 p-8">
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="text-gray-400 hover:text-gray-200">
                            <FiHome className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                        <Link 
                            href="/swagger" 
                            className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                            <span>API Docs</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="bg-gray-800 text-white rounded-md border-gray-700 focus:border-blue-500 focus:ring-blue-500 p-2"
                        >
                            <option value="today">Bugün</option>
                            <option value="week">Son 7 Gün</option>
                            <option value="month">Son 30 Gün</option>
                        </select>
                        <button
                            onClick={clearLogs}
                            disabled={clearingLogs}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                            <FiTrash2 className="w-4 h-4 mr-2" />
                            {clearingLogs ? 'Temizleniyor...' : 'Logları Temizle'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            <FiLogOut className="w-4 h-4 mr-2" />
                            Çıkış
                        </button>
                    </div>
                </div>

                {/* System Status */}
                <div className="mb-8">
                    <SystemStatus />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {/* Toplam İstek */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">
                                Toplam İstek
                            </h3>
                            <div className="flex items-center space-x-2 text-gray-400">
                                <span className="text-sm">Son 24 saat</span>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-4xl font-bold text-white">
                                    {data?.totalRequests?.[0]?.count || 0}
                                </span>
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <FiActivity className="w-6 h-6 text-blue-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Başarılı İstekler */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">
                                Başarılı İstekler
                            </h3>
                            <div className="flex items-center space-x-2 text-gray-400">
                                <span className="text-sm">Başarı Oranı</span>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-4xl font-bold text-white">
                                    {data?.requestsByStatus?.find((s: any) => s.status_code === 200)?.count || 0}
                                </span>
                                <div className="p-3 bg-green-500/10 rounded-lg">
                                    <FiCheckCircle className="w-6 h-6 text-green-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Başarı Oranı</span>
                                <span className="text-green-400 font-medium">
                                    %{Math.round(
                                        ((data?.requestsByStatus?.find((s: any) => s.status_code === 200)?.count || 0) / 
                                        (data?.totalRequests?.[0]?.count || 1)) * 100
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Ortalama Yanıt Süresi */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">
                                Ortalama Yanıt Süresi
                            </h3>
                            <div className="flex items-center space-x-2 text-gray-400">
                                <span className="text-sm">Tüm istekler</span>
                            </div>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-4xl font-bold text-white">
                                    {((data?.averageResponseTime?.[0]?.avg_response_time || 0) / 1000).toFixed(2)}
                                </span>
                                <div className="p-3 bg-purple-500/10 rounded-lg">
                                    <FiClock className="w-6 h-6 text-purple-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Saniye</span>
                                <span className={`font-medium ${
                                    (data?.averageResponseTime?.[0]?.avg_response_time || 0) > 5000 ? 'text-red-400' :
                                    (data?.averageResponseTime?.[0]?.avg_response_time || 0) > 2000 ? 'text-yellow-400' :
                                    'text-purple-400'
                                }`}>
                                    {(data?.averageResponseTime?.[0]?.avg_response_time || 0) > 5000 ? 'Yavaş' :
                                     (data?.averageResponseTime?.[0]?.avg_response_time || 0) > 2000 ? 'Normal' :
                                     'Hızlı'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rate Limits Section */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <FiClock className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            API Kullanım Limitleri
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rateLimits?.limits.map((limit, index) => {
                            const usagePercent = (limit.used / limit.limit) * 100;
                            const isWarning = usagePercent > 70;
                            const isDanger = usagePercent > 90;
                            
                            return (
                                <div 
                                    key={index}
                                    className="bg-gray-800 rounded-xl border border-gray-700 p-6"
                                >
                                    {/* Başlık ve Durum */}
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {limit.description}
                                        </h3>
                                        <div className="flex items-center space-x-2 text-gray-400">
                                            <span className="text-sm">Periyot: {limit.window}</span>
                                        </div>
                                    </div>

                                    {/* Kullanım Bilgisi */}
                                    <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-400">Toplam Limit</span>
                                            <span className="text-white font-bold">{limit.limit}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-gray-400">Kullanılan</span>
                                            <span className="text-white font-bold">{limit.used}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Kalan</span>
                                            <span className={`font-bold ${
                                                isDanger ? 'text-red-400' :
                                                isWarning ? 'text-yellow-400' :
                                                'text-green-400'
                                            }`}>{limit.remaining}</span>
                                        </div>
                                    </div>

                                    {/* İlerleme Çubuğu */}
                                    <div className="space-y-2">
                                        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    isDanger ? 'bg-red-500' :
                                                    isWarning ? 'bg-yellow-500' :
                                                    'bg-green-500'
                                                }`}
                                                style={{ width: `${usagePercent}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Kullanım Oranı</span>
                                            <span className={`font-medium ${
                                                isDanger ? 'text-red-400' :
                                                isWarning ? 'text-yellow-400' :
                                                'text-green-400'
                                            }`}>
                                                %{Math.round(usagePercent)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="overflow-x-auto">
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Ara..."
                                value={globalFilter}
                                onChange={e => setGlobalFilter(e.target.value)}
                                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
                            />
                        </div>
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900">
                                <tr>
                                    {table.getFlatHeaders().map(header => (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-2">
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {{
                                                    asc: ' 🔼',
                                                    desc: ' 🔽',
                                                }[header.column.getIsSorted() as string] ?? null}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-700">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => table.setPageIndex(0)}
                                    disabled={!table.getCanPreviousPage()}
                                    className="px-3 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded disabled:opacity-50 hover:bg-gray-600"
                                >
                                    {'<<'}
                                </button>
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="px-3 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded disabled:opacity-50 hover:bg-gray-600"
                                >
                                    {'<'}
                                </button>
                                <button
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="px-3 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded disabled:opacity-50 hover:bg-gray-600"
                                >
                                    {'>'}
                                </button>
                                <button
                                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                    disabled={!table.getCanNextPage()}
                                    className="px-3 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded disabled:opacity-50 hover:bg-gray-600"
                                >
                                    {'>>'}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                                <span className="text-sm">
                                    Sayfa{' '}
                                    <strong>
                                        {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                                    </strong>
                                </span>
                                <select
                                    value={table.getState().pagination.pageSize}
                                    onChange={e => {
                                        table.setPageSize(Number(e.target.value));
                                    }}
                                    className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                                >
                                    {[10, 20, 30, 40, 50].map(pageSize => (
                                        <option key={pageSize} value={pageSize}>
                                            {pageSize} satır göster
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
