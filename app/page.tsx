"use client";
import Link from "next/link";
import { BsSpeedometer2, BsBook } from "react-icons/bs";
import { TbDatabase } from "react-icons/tb";
import { FiServer } from "react-icons/fi";
import { MdQueue } from "react-icons/md";
import { SqlQueryForm } from "../components/sql-query-form";
import { useState, useEffect } from "react";
import axios from "axios";
import { HealthConnection, SQLConfig } from "@/types/config";
import { DatabaseSelect } from "@/components/database-select";

export default function Home() {
  const [databases, setDatabases] = useState<SQLConfig[]>([]);
  const [databasesLoading, setDatabasesLoading] = useState(true);
  const [selectedDatabase, setSelectedDatabase] = useState<
    SQLConfig | undefined
  >();
  const [health, setHealth] = useState<HealthConnection>();
  const [healthLoading, setHealthLoading] = useState<boolean>();

  useEffect(() => {
    const getDatabases = async () => {
      try {
        setDatabasesLoading(true);
        const res = await axios.get<SQLConfig[]>("/api/database", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `111`,
          },
        });
        setDatabases(res.data);
      } catch (error) { } finally {
        setDatabasesLoading(false);
      }
    };
    getDatabases();
  }, []);

  const checkConnection = async () => {
    try {
      setHealthLoading(true);
      const res = await axios.get<HealthConnection>(
        `/api/database/${selectedDatabase?.databaseId}/health`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: selectedDatabase?.apiKey,
          },
        }
      );

      setHealth(res.data);
    } catch (error) {
      setHealth({
        databaseConnection: false,
        serverConnection: false,
      });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if(selectedDatabase){
      checkConnection();
    }
  }, [selectedDatabase]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-gray-900 to-black text-white p-8">
      {/* Content Container */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            RobotPOS RealTime API
          </h1>
          <p className="text-xl text-gray-300">
            Gerçek zamanlı veri erişimi ve analiz için güçlü API çözümü
          </p>
        </div>
        {databasesLoading ? (<div className="flex items-center justify-center py-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-300">Veritabanları yükleniyor...</span>
        </div>) : (

          <>
            {/* Database Dropdown Section */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-gray-800/30 backdrop-blur-lg p-8 rounded-xl border border-gray-700/50 shadow-lg">
                <DatabaseSelect
                  databases={databases}
                  selectedDatabase={selectedDatabase}
                  onDatabaseChange={(database) => {
                    setSelectedDatabase(database);
                  }}
                />
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
              <div className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-lg ${health?.serverConnection ? "bg-green-500/20" : "bg-red-500/20"
                      } transition-colors duration-300`}
                  >
                    <FiServer
                      className={`w-6 h-6 ${health?.serverConnection ? "text-green-400" : "text-red-400"
                        }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Sunucu Durumu</h3>
                    <p
                      className={`${healthLoading
                        ? "text-yellow-500"
                        : health?.serverConnection
                          ? "text-green-400"
                          : "text-red-400"
                        } font-medium`}
                    >
                      {healthLoading
                        ? "Kontrol ediliyor..."
                        : health?.serverConnection
                          ? "Aktif"
                          : "Pasif"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3 rounded-lg ${health?.databaseConnection
                      ? "bg-blue-500/20"
                      : "bg-red-500/20"
                      } transition-colors duration-300`}
                  >
                    <TbDatabase
                      className={`w-6 h-6 ${health?.databaseConnection
                        ? "text-blue-400"
                        : "text-red-400"
                        }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Veritabanı Durumu</h3>
                    <p
                      className={`${healthLoading
                        ? "text-yellow-500"
                        : health?.databaseConnection
                          ? "text-blue-400"
                          : "text-red-400"
                        } font-medium`}
                    >
                      {healthLoading
                        ? "Kontrol ediliyor..."
                        : health?.databaseConnection
                          ? "Bağlı"
                          : "Bağlantı Yok"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
              <Link target="_blank" href="/analytics" className="group">
                <div className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg group-hover:shadow-xl group-hover:border-blue-500/50 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition duration-300">
                      <BsSpeedometer2 className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Analiz Paneli</h3>
                      <p className="text-gray-300">
                        API kullanım istatistikleri ve analizler
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link target="_blank" href="/swagger" className="group">
                <div className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg group-hover:shadow-xl group-hover:border-yellow-500/50 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition duration-300">
                      <BsBook className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">API Dokümantasyonu</h3>
                      <p className="text-gray-300">
                        API endpoint'leri ve kullanım kılavuzu
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <a
                href="http://localhost:3100"
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <div className="bg-gray-800/30 backdrop-blur-lg p-6 rounded-xl border border-gray-700/50 shadow-lg group-hover:shadow-xl group-hover:border-green-500/50 transition-all duration-300">
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
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800/30 backdrop-blur-lg p-8 rounded-xl border border-gray-700/50 shadow-lg">
                <h2 className="text-2xl font-bold mb-6">SQL Sorgu Arayüzü</h2>
                <div className="mb-4">
                  <DatabaseSelect
                    databases={databases}
                    selectedDatabase={selectedDatabase}
                    onDatabaseChange={(database) => {
                      setSelectedDatabase(database);
                      checkConnection();
                    }}
                    showLabel={false}
                  />
                </div>
                <SqlQueryForm selectedDatabase={selectedDatabase} />
              </div>
            </div>
          </>

        )}

      </div>
    </div>
  );
}
