import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = './images';
const OUTPUT_DIR = './images-optimized';

async function compressImages() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(IMAGES_DIR);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

    const inputPath = path.join(IMAGES_DIR, file);
    const outputName = path.basename(file, ext) + '.webp';
    const outputPath = path.join(OUTPUT_DIR, outputName);

    try {
      const stats = fs.statSync(inputPath);
      const originalSize = stats.size;

      let width = 1920;
      if (file.includes('首页')) {
        width = 1200;
      } else if (file.includes('香料')) {
        width = 800;
      }

      await sharp(inputPath)
        .resize(width, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70, alphaQuality: 80 })
        .toFile(outputPath);

      const newStats = fs.statSync(outputPath);
      const newSize = newStats.size;
      const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

      console.log(`✅ ${file} -> ${outputName}`);
      console.log(`   原始: ${(originalSize / 1024).toFixed(1)} KB`);
      console.log(`   压缩: ${(newSize / 1024).toFixed(1)} KB`);
      console.log(`   节省: ${savings}%\n`);
    } catch (error) {
      console.error(`❌ 处理 ${file} 失败:`, error.message);
    }
  }

  console.log('🎉 图片压缩完成！');
}

compressImages();
