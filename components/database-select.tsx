import { SQLConfig } from "@/types/config";

interface DatabaseSelectProps {
  databases: SQLConfig[];
  selectedDatabase?: SQLConfig;
  onDatabaseChange: (database: SQLConfig | undefined) => void;
  showLabel?: boolean;
}

export function DatabaseSelect({
  databases,
  selectedDatabase,
  onDatabaseChange,
  showLabel = true
}: DatabaseSelectProps) {
  return (
    <div className="w-full">
      {showLabel && (
        <h2 className="text-2xl font-bold mb-6">Veritabanı Seçimi</h2>
      )}
      <select
        className="w-full bg-gray-700/50 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
        onChange={(e) => {
          const selected = databases.find(db => db.databaseId === parseInt(e.target.value));
          onDatabaseChange(selected);
        }}
        value={selectedDatabase?.databaseId || ''}
      >
        <option value="">Veritabanı Seçiniz</option>
        {databases.map((db) => (
          <option key={`${db.tenantId}-${db.databaseId}`} value={db.databaseId}>
            {`${db.tenantId}`}
          </option>
        ))}
      </select>
    </div>
  );
}