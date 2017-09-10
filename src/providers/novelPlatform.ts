import 'rxjs/add/operator/retry';

import { PlatformManager } from './platformManager';
import { Novel } from './novel';

export class NovelPlatform {
  protected parser: DOMParser = new DOMParser();

  constructor(
    public manager: PlatformManager,
    private _id: string
    ) {
    this.init();
  }

  toast(text: string, time?:number): Promise<any> {
    this.manager.events.publish('toast', text, time);
    return new Promise(r => setTimeout(r, time));
  }

  _htmlGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.manager.http.get(url)
        .retry(5)
        .subscribe((data) => {
        resolve(data.text());
      }, (error) => {
        reject(error);
      });
    })
  }

  get storage() {
    return this.manager.storage;
  }

  get id(): string {
    return this._id;
  }

  async getDoc(url: string, proc?): Promise<any> {
    let html = await this._htmlGet(url);
    if (proc) {
      html = proc(html);
    }
    return this.parser.parseFromString(html, 'text/html');
  }

  // overrides
  init() {
    throw new Error('need implem!!');
  }

  getGenres(): Array<[number, string]> {
    throw new Error('need implem!!');
  }

  getNovelList(genre, page?:number): Promise<any> {
    throw new Error('need implem!!');
  }

  resolveDirectoryUrl(id: string): string {
    throw new Error('need implem!!');
  }

  resolveChapterUrl(...args: string[]): string {
    throw new Error('need implem!!');
  }

  getChapterUrl(chapter: number, novelId: string, directory: Array<any>): Promise<any> {
    throw new Error('need implem!!');
  }

  scrapDirectory(url: string): Promise<any> {
    throw new Error('need implem!!');
  }

  scrapChapter(url: string): Promise<any> {
    throw new Error('need implem!!');
  }

  getNovelMeta(novel: Novel, force?: boolean): Promise<any> {
    throw new Error('need implem!!');
  }
}