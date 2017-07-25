
import { Wuxiaco } from './wuxiaco';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

const ST_CURRENT_CHAPTER = 'current-chapter';
const ST_CHAPTER_TXT = 'chapter-txt-';
const ST_CHAPTER_SCROLL = 'chapter-scroll-';
const ST_NOVEL_DIR = 'novel-directory';

const arrayRange = (n: number, offset:number=0) => {
  return Array.apply(null, Array(n)).map((x, i) => i + offset);
}

const arrayToChunk = (array: Array<any>, n: number) => {
  return Array.from(Array(Math.ceil(array.length / n)), (_,i) => array.slice(i * n, i * n + n));
}

export class Novel {
  public manager: Wuxiaco;
  public id: string;
  public title: string;
  public author: string;
  public desc: string;

  private _maxChapter: number;

  constructor(
    manager: Wuxiaco,
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
    this._maxChapter = null;
  }

  meta() {
    return {
      title: this.title,
      id: this.id,
      author: this.author,
      desc: this.desc
    };
  }

  href(): string {
    return `/${this.id}/`;
  }

  resolveUrl(chapter) {
    return this.manager.resolveUrl(chapter, this.id);
  }

  async getDirectory(): Promise<any[]> {
    let url = this.manager.wuxiacoUrl(this.id, 'all.html');

    try {
      const directory = await this.manager.scrapDirectory(url);
      this.setStoredCompressed(ST_NOVEL_DIR, directory);
      return directory;
    } catch (error) {
      const cachedDirectory = await this.getStoredCompressed(ST_NOVEL_DIR);
      if (cachedDirectory) {
        return cachedDirectory;
      }
      throw 'no directory available';
    }
  }

  async scrap(chapter) {
    try {
      const directory = await this.getDirectory();
      if (chapter > directory.length) {
        return { error: "Chapter doesn't " + chapter + " exist yet" };
      }
      const chapterElement = directory[chapter - 1]
      const url = this.manager.wuxiacoUrl(this.id, chapterElement[0]);
      return await this.manager.scrapChapter(url);
    } catch (error) {
      let mes = 'Download error: ' + chapter + ' ' + this.title;
      console.log(mes);
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
        const chapterElement = directory[i];
        const url = this.manager.wuxiacoUrl(this.id, chapterElement[0]);
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

  getMoreMeta(force: boolean=false): Promise<any> {
    return this.manager.getNovelMeta(this, force);
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

  async getMaxChapter() {
    if (this._maxChapter) {
      return this._maxChapter;
    }
    try {
      const directory = await this.getDirectory();
      this._maxChapter = directory.length;
      return this._maxChapter;
    } catch (error) {
      this._maxChapter = null;
      return 20000;
    }
  }

  async getCurrentChapter() {
    const chapter = await this.getStored(ST_CURRENT_CHAPTER);
    if (chapter)
      return chapter
    return 1
  }
}