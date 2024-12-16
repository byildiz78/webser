// scripts/copy-files.js
const fs = require('fs-extra');
const path = require('path');

async function copyFiles() {
  try {
    const standalone = path.join('.next', 'standalone');
    
    // Tüm kopyalama işlemleri için hedef dizinlerin varlığını kontrol et
    await fs.ensureDir(path.join(standalone, '.next', 'static'));
    await fs.ensureDir(path.join(standalone, 'public'));

    // Kopyalama işlemleri
    const copyTasks = [
      // Static dosyaları
      {
        src: path.join('.next', 'static'),
        dest: path.join(standalone, '.next', 'static'),
        name: 'static files'
      },
      // Public klasörü
      {
        src: 'public',
        dest: path.join(standalone, 'public'),
        name: 'public folder'
      },
      // AppSettings
      {
        src: 'appSettings.json',
        dest: path.join(standalone, 'appSettings.json'),
        name: 'appSettings.json'
      },
      // Public içindeki appSettings
      {
        src: 'appSettings.json',
        dest: path.join(standalone, 'public', 'appSettings.json'),
        name: 'public appSettings.json'
      }
    ];

    // Tüm kopyalama işlemlerini gerçekleştir
    for (const task of copyTasks) {
      try {
        if (fs.existsSync(task.src)) {
          await fs.copy(task.src, task.dest);
          console.log(`✅ ${task.name} başarıyla kopyalandı`);
        } else {
          console.warn(`⚠️ ${task.name} bulunamadı, atlanıyor`);
        }
      } catch (err) {
        console.error(`❌ ${task.name} kopyalanırken hata:`, err);
      }
    }

    // .env dosyalarını kopyala
    const envFiles = ['.env.production.local', '.env.production', '.env.local', '.env'];
    let envCopied = false;

    for (const envFile of envFiles) {
      if (!envCopied && fs.existsSync(envFile)) {
        try {
          await fs.copy(envFile, path.join(standalone, '.env'));
          console.log(`✅ ${envFile} başarıyla kopyalandı`);
          envCopied = true;
        } catch (err) {
          console.error(`❌ ${envFile} kopyalanırken hata:`, err);
        }
      }
    }

    if (!envCopied) {
      console.warn('⚠️ Hiçbir .env dosyası bulunamadı');
    }

    console.log('✨ Tüm dosya kopyalama işlemleri tamamlandı');

  } catch (err) {
    console.error('❌ Kritik hata:', err);
    process.exit(1);
  }
}

copyFiles();