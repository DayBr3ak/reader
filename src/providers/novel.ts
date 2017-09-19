
import { NovelPlatform } from './novelPlatform';
import { compressToBase64, decompressFromBase64 } from 'lz-string/libs/lz-string.min';

const ST_CURRENT_CHAPTER = 'current-chapter';
const ST_CHAPTER_TXT = 'chapter-txt-';
const ST_CHAPTER_SCROLL = 'chapter-scroll-';
const ST_NOVEL_DIR = 'novel-directory';
const ST_MOREMETA = 'novel-moremeta';

const _1MIN = 60 * 1000;
const _1HOUR = 60 * _1MIN;
const TIMESTAMP_MOREMETA =  4 * _1HOUR;
const TIMESTAMP_DIRECTORY = 1 * _1HOUR + 20 * _1MIN;

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

  cachePromises: any = {};

  async cache(opts) {
    if (this.cachePromises[opts.id]) {
      return this.cachePromises[opts.id];
    }

    const promiseGen = async () => {
      let cached;
      if (opts.compressed === true) {
        cached = await this.getStoredCompressed(opts.key);
      } else {
        cached = await this.getStored(opts.key);
      }
      if (cached === null || cached._timestamp === undefined || Date.now() - cached._timestamp > opts.timeout) {
        // console.log(cached);
        // if (cached && Date.now() - cached._timestamp > opts.timeout) {
        //   console.log('stale')
        // }
        try {
          cached = await opts.fallback.bind(this)();
        } catch(error) {
          this.cachePromises[opts.id] = null;
          throw error;
        }

        if (opts.compressed === true) {
          await this.setStoredCompressed(opts.key, cached);
        } else {
          await this.setStored(opts.key, cached);
        }

        opts.log && console.log(opts.log);
      }
      this.cachePromises[opts.id] = null;
      return cached;
    }
    this.cachePromises[opts.id] = promiseGen();
    return this.cachePromises[opts.id];
  }

  async _getDirectory(): Promise<any> {
    let url = this.manager.resolveDirectoryUrl(this.id);
    try {
      const directory = await this.manager.scrapDirectory(url);
      return {
        directory: directory,
        _timestamp: Date.now()
      }
    } catch (error) {
      const cachedDirectory = await this.getStoredCompressed(ST_NOVEL_DIR);
      if (cachedDirectory) {
        return {
          directory: cachedDirectory.directory,
        }
      }
      console.error('Error in novel._getDirectory');
      console.error(error)
      throw error;
    }
  }

  async getDirectory(): Promise<any[]> {
    let cached = await this.cache({
      id: 'directory',
      compressed: true,
      key: ST_NOVEL_DIR,
      timeout: TIMESTAMP_DIRECTORY,
      log: 'timestamp directory ' + this.title,
      fallback: async () => {
        return this._getDirectory();
      }
    });

    if (cached)
      return cached.directory;
    return null;
  }

  async _invalidCache() {
    await this.setStored(ST_NOVEL_DIR, null);
    await this.setStored(ST_MOREMETA, null);
    console.log('cache cleared');
  }

  async scrap(chapter) {
    try {
      const directory = await this.getDirectory();
      if (chapter > directory.length) {
        throw {
          message: `Chapter ${chapter} doesn't exist yet`,
          error: `chapter (${chapter}) > maxChapter (${directory.length})`
        };
      }
      const url = await this.manager.getChapterUrl(chapter, this.id, directory);
      return await this.manager.scrapChapter(url);
    } catch (error) {
      let result = error;
      if (error.error === undefined) {
        let mes = 'Download error: ' + chapter + ' ' + this.title;
        console.log(mes);
        console.error(error)
        result = { message: mes, error: error };
      }
      throw result;
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
    const maxChapterPromise = this.getMaxChapter();
    const meta = await this.cache({
      id: 'moremeta',
      compressed: false,
      key: ST_MOREMETA,
      timeout: TIMESTAMP_MOREMETA,
      log: 'timestamp novelmeta ' + this.title,
      fallback: async () => {
        try {
          let meta = await this.manager.getNovelMeta(this, force);
          meta._timestamp = Date.now();
          return meta;
        } catch (error) {
          return {
            Error: "Internet Disconnected",
            _error: true
          }
        }
      }
    });

    if (meta['_error'] === undefined) {
      if (meta['_Desc']) {
        this.desc = meta['_Desc'];
      }
      if (meta['_Author']) {
        this.author = meta['_Author'];
      }
      if (meta['_Title']) {
        this.title = meta['_Title'];
      }
      const lastRead = await currentChapterPromise;
      if (lastRead > 1) {
        meta['Last Read'] = lastRead;
      }
      meta['Last Released'] = await maxChapterPromise;
    }
    return meta;
  }

  async getMaxChapter(): Promise<number> {
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

  async getCurrentChapter(): Promise<number> {
    const chapter = await this.getStored(ST_CURRENT_CHAPTER);
    if (chapter)
      return chapter
    return 1
  }
}
