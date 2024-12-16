// scripts/copy-files.js

const fs = require('fs-extra');
const path = require('path');

async function copyFiles() {
  try {
    // Static dosyalarını kopyala
    await fs.copy(
      path.join('.next', 'static'),
      path.join('.next', 'standalone', '.next', 'static')
    );

    // Public klasörünü kopyala
    await fs.copy(
      path.join('public'),
      path.join('.next', 'standalone', 'public')
    );

    // .env dosyalarını kopyala
    const envFiles = ['.env', '.env.local', '.env.production'];
    for (const envFile of envFiles) {
      try {
        if (fs.existsSync(envFile)) {
          await fs.copy(
            envFile,
            path.join('.next', 'standalone', '.env')
          );
          break; // İlk bulunan .env dosyasını kopyaladıktan sonra döngüden çık
        }
      } catch (err) {
        console.error(`${envFile} kopyalanırken hata oluştu:`, err);
      }
    }

  } catch (err) {
    console.error('Dosya kopyalama hatası:', err);
    process.exit(1);
  }
}

copyFiles();
