'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BsSpeedometer2, BsBook } from 'react-icons/bs';
import { TbDatabase } from 'react-icons/tb';
import { FiServer } from 'react-icons/fi';
import { MdQueue } from 'react-icons/md';
import { SqlQueryForm } from '../components/sql-query-form';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState({
    server: false,
    database: false,
    loading: true
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/test-connection');
        const data = await res.json();
        setIsConnected({
          server: true,
          database: data.success,
          loading: false
        });
      } catch (error) {
        setIsConnected({
          server: false,
          database: false,
          loading: false
        });
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-gray-900 to-black text-white p-8">
      {/* Content Container */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div
          className="max-w-4xl mx-auto text-center mb-16"
        >
          <h1 
            className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
          >
            RobotPOS RealTime API
          </h1>
          <p 
            className="text-xl text-gray-300"
          >
            Gerçek zamanlı veri erişimi ve analiz için güçlü API çözümü
          </p>
        </div>

        {/* Status Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16"
        >
          <div 
            className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${isConnected.server ? 'bg-green-500/20' : 'bg-red-500/20'} transition-colors duration-300`}>
                <FiServer className={`w-6 h-6 ${isConnected.server ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sunucu Durumu</h3>
                <p className={`${isConnected.loading ? "text-yellow-500" : isConnected.server ? "text-green-400" : "text-red-400"} font-medium`}>
                  {isConnected.loading ? "Kontrol ediliyor..." : isConnected.server ? "Aktif" : "Pasif"}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${isConnected.database ? 'bg-blue-500/20' : 'bg-red-500/20'} transition-colors duration-300`}>
                <TbDatabase className={`w-6 h-6 ${isConnected.database ? 'text-blue-400' : 'text-red-400'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Veritabanı Durumu</h3>
                <p className={`${isConnected.loading ? "text-yellow-500" : isConnected.database ? "text-blue-400" : "text-red-400"} font-medium`}>
                  {isConnected.loading ? "Kontrol ediliyor..." : isConnected.database ? "Bağlı" : "Bağlantı Yok"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16"
        >
          <Link href="/analytics" className="group">
            <div 
              className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg group-hover:shadow-xl group-hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition duration-300">
                  <BsSpeedometer2 className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Analiz Paneli</h3>
                  <p className="text-gray-300">API kullanım istatistikleri ve analizler</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/swagger" className="group">
            <div 
              className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg group-hover:shadow-xl group-hover:border-yellow-500/50 transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition duration-300">
                  <BsBook className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">API Dokümantasyonu</h3>
                  <p className="text-gray-300">API endpoint'leri ve kullanım kılavuzu</p>
                </div>
              </div>
            </div>
          </Link>

          <a href="http://localhost:3100" target="_blank" rel="noopener noreferrer" className="group">
            <div 
              className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg group-hover:shadow-xl group-hover:border-green-500/50 transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition duration-300">
                  <MdQueue className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Bull Board</h3>
                  <p className="text-gray-300">Kuyruk yönetimi ve izleme</p>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* SQL Query Section */}
        <div
          className="max-w-4xl mx-auto"
        >
          <div className="bg-gray-800/30 backdrop-blur-lg p-8 rounded-xl border border-gray-700/50 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">SQL Sorgu Arayüzü</h2>
            <SqlQueryForm />
          </div>
        </div>
      </div>
    </div>
  );
}
