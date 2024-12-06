export const dbConfig = {
  user: process.env.SQL_SERVER_USER || 'burhan',
  password: process.env.SQL_SERVER_PASSWORD || 'kereviz1!',
  server: process.env.SQL_SERVER_HOST || 'srv9.robotpos.com',
  port: parseInt(process.env.SQL_SERVER_PORT || '1281'),
  database: process.env.SQL_SERVER_DB || 'DemoDB',
  options: {
    encrypt: process.env.ENCRYPTION === 'yes',
    trustServerCertificate: process.env.TRUST_SERVER_CERTIFICATE === 'true',
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
};