import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';

class ImageCache {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'assets', 'cache_img');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * @param {string} url 
   * @returns {Promise<Buffer>} 
   */
  async get(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

    const hash = crypto.createHash('md5').update(url).digest('hex');
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const fileName = `${hash}${ext}`;
    const filePath = path.join(this.cacheDir, fileName);

    
    if (fs.existsSync(filePath)) {
     
      const stats = fs.statSync(filePath);
      if (Date.now() - stats.mtimeMs < 7 * 24 * 60 * 60 * 1000) {
        return fs.readFileSync(filePath);
      }
    }

   
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      
      fs.promises.writeFile(filePath, buffer).catch(() => {});
      
      return buffer;
    } catch (error) {
      console.error(chalk.red(`Error descargando ${url}:`), error.message);
      return null;
    }
  }

  /**
   */
  async autoClean(maxAgeDays = 7) {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > maxAgeDays * 24 * 60 * 60 * 1000) {
          await fs.promises.unlink(filePath);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(chalk.gray(`Limpieza: ${cleaned} imágenes eliminadas.`));
      }
    } catch {}
  }
}

const imageCache = new ImageCache();
export default imageCache;
