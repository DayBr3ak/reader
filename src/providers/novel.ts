
import { NovelPlatform } from './novelPlatform';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

const ST_CURRENT_CHAPTER = 'current-chapter';
const ST_CHAPTER_TXT = 'chapter-txt-';
const ST_CHAPTER_SCROLL = 'chapter-scroll-';
const ST_NOVEL_DIR = 'novel-directory';
const ST_MOREMETA = 'novel-moremeta';

const _1MIN = 60 * 1000;
const TIMESTAMP_MOREMETA = 10 * _1MIN;
const TIMESTAMP_DIRECTORY = 15* _1MIN;

const arrayRange = (n: number, offset:number=0) => {
  return Array.apply(null, Array(n)).map((x, i) => i + offset);
}

const arrayToChunk = (array: Array<any>, n: number) => {
  return Array.from(Array(Math.ceil(array.length / n)), (_,i) => array.slice(i * n, i * n + n));
}

export class Novel {
  public id: string;
  public title: string;
  public author: string;
  public desc: string;
  public _platform: string;

  constructor(
    public manager: NovelPlatform,
    opts: any
  ) {
    this.manager = manager;
    if (!opts.id || !opts.title) {
      opts.error = 'need title and id'
      console.error(opts)
      throw opts
    }
    this.id = opts.id;
    this.title = opts.title;
    this.author = opts.author || 'Unknown';
    this.desc = opts.desc || 'None';
    this._platform = opts._platform || 'classic';
  }

  meta() {
    return {
      title: this.title,
      id: this.id,
      author: this.author,
      desc: this.desc,
      _platform: this.manager.id
    };
  }

  async cache(opts) {
    let cached;
    if (opts.compressed === true) {
      cached = await this.getStoredCompressed(opts.key);
    } else {
      cached = await this.getStored(opts.key);
    }
    if (cached === null || Date.now() - cached._timestamp > opts.timeout) {
      cached = await opts.fallback.bind(this)();
      cached._timestamp = Date.now();

      if (opts.compressed === true) {
        this.setStoredCompressed(opts.key, cached);
      } else {
        this.setStored(opts.key, cached);
      }

      opts.log && console.log(opts.log);
    }
    return cached;
  }

  async _getDirectory(): Promise<any[]> {
    let url = this.manager.resolveDirectoryUrl(this.id);
    try {
      const directory = await this.manager.scrapDirectory(url);
      // this.setStoredCompressed(ST_NOVEL_DIR, directory);
      return directory;
    } catch (error) {
      const cachedDirectory = await this.getStoredCompressed(ST_NOVEL_DIR);
      if (cachedDirectory) {
        return cachedDirectory;
      }
      console.error(error)
      throw error;
    }
  }

  async getDirectory(): Promise<any[]> {
    return this.cache({
      compressed: true,
      key: ST_NOVEL_DIR,
      timeout: TIMESTAMP_DIRECTORY,
      log: 'timestamp directory ' + this.title,
      fallback: () => {
        return this._getDirectory();
      }
    });
  }

  async scrap(chapter) {
    try {
      const directory = await this.getDirectory();
      if (chapter > directory.length) {
        return { error: `Chapter ${chapter} doesn't exist yet` };
      }
      const url = await this.manager.getChapterUrl(chapter, this.id, directory);
      return await this.manager.scrapChapter(url);
    } catch (error) {
      let mes = 'Download error: ' + chapter + ' ' + this.title;
      console.log(mes);
      console.error(error)
      throw { message: mes, error: error };
    }
  }

  async download() {
    const cacheChapter = async (chapter, url) => {
      const cachedContent = await this.getStored(ST_CHAPTER_TXT + chapter);
      if (cachedContent) {
        console.log('Skip Ch' + chapter + '... Already in cache');
        return;
      }
      const content = await this.manager.scrapChapter(url);
      this.cacheChapterContent(chapter, content);
    }

    try {
      const directory = await this.getDirectory();
      const urls = [];
      for (let i = 0; i < directory.length; i++) {
        const url = await this.manager.getChapterUrl(i + 1, this.id, directory);
        urls.push([i + 1, url]);
      }
      let count = 0;
      for (let chunk of arrayToChunk(urls, 20)) {
        const promises = chunk.map(tuple => cacheChapter(tuple[0], tuple[1]));
        await Promise.all(promises);
        count += chunk.length;
        console.log(`downloaded ${count} chapters`);
      }
      return directory.length;
    } catch (error) {
      console.log('Error download ' + error);
      return -1
    }
  }

  async removeDownload() {
    const max = await this.getMaxChapter();
    const range = arrayRange(max, 1);

    for (let chunk of arrayToChunk(range, 50)) {
      const promises = chunk.map(chapter => this.manager.storage.remove(this.id + '-' + ST_CHAPTER_TXT + chapter));
      await Promise.all(promises);
      console.log('removed 50 or less chapters');
    }
    console.log('done');
  }

  async getMoreMeta(force: boolean=false): Promise<any> {
    const currentChapterPromise = this.getCurrentChapter();
    const meta = await this.cache({
      compressed: false,
      key: ST_MOREMETA,
      timeout: TIMESTAMP_MOREMETA,
      log: 'timestamp novelmeta ' + this.title,
      fallback: () => {
        return this.manager.getNovelMeta(this, force);
      }
    });

    const lastRead = await currentChapterPromise;
    if (lastRead > 1) {
      meta['Last Read'] = lastRead;
    }
    return meta;
  }

  async getMaxChapter() {
    try {
      const directory = await this.getDirectory();
      return directory.length;
    } catch (error) {
      return 20000;
    }
  }

  getStored(property: string, prefix: string = this.id): Promise<any> {
    return this.manager.storage.get(prefix + '-' + property);
  }

  setStored(property: string, val: any, prefix: string = this.id): Promise<any> {
    return this.manager.storage.set(prefix + '-' + property, val);
  }

  getStoredCompressed(property: string): Promise<any> {
    return this.getStored(property).then((data) => {
      if (data) {
        let uncompressed = decompressFromBase64(data);
        return JSON.parse(uncompressed);
      } else {
        return null;
      }
    })
  }

  setStoredCompressed(property: string, val: any): Promise<any> {
    let compressed = compressToBase64(JSON.stringify(val));
    return this.setStored(property, compressed).then(() => {
      return val;
    });
  }

  setScroll(chapter: number, scroll: number): Promise<any> {
    return this.setStored(ST_CHAPTER_SCROLL + chapter, scroll);
  }

  getScroll(chapter: number): Promise<any> {
    return this.getStored(ST_CHAPTER_SCROLL + chapter);
  }

  setCurrentChapter(chapter: number): Promise<any> {
    return this.setStored(ST_CURRENT_CHAPTER, chapter);
  }

  cacheChapterContent(chapter: number, content: string): Promise<any> {
    return this.setStoredCompressed(ST_CHAPTER_TXT + chapter, content);
  }

  getChapterContent(chapter: number): Promise<any> {
    return this.getStoredCompressed(ST_CHAPTER_TXT + chapter);
  }

  async getCurrentChapter() {
    const chapter = await this.getStored(ST_CURRENT_CHAPTER);
    if (chapter)
      return chapter
    return 1
  }
}
