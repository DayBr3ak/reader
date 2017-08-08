import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Events } from 'ionic-angular';
import 'rxjs/add/operator/map';
import { Storage } from '@ionic/storage';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { PlatformManager } from './platformManager';
import { Novel } from './novel';

const ST_BOOKMARK = 'app-bookmarks';
const ST_BOOKMARK_VERSION = 'app-bookmarks-version';
const ST_BOOKMARK_NOVEL_LAST_READ = 'app-bookmarks-last-read';
const ST_BOOKMARK_NOVEL_MAX_CHAPTER = 'app-bookmarks-max-chapter';
const ST_BOOKMARK_NOVEL_WAS_UPTODATE = 'app-bookmarks-was-uptodate';
const BK_VERSION = 1.8;

type NovelReadMap = {
  novelId: string,
  currentChapter: number
};
type NovelMaxMap = {
  novelId: string,
  maxChapter: number
};
type NovelUpMap = {
  novelId: string,
  wasUptodate: boolean
};

@Injectable()
export class BookmarkProvider {
  private _version: number = null;
  private novelsLastRead: NovelReadMap;
  private novelsMaxChapter: NovelMaxMap;
  private novelsWasUptodate: NovelUpMap;

  constructor(public http: Http,
    public events: Events,
    private novelService: PlatformManager,
    public storage: Storage,
    private ga: GoogleAnalytics
  ) {
    console.log('Hello BookmarkProvider Provider');

    this.events.subscribe('add:bookmark', (novel: Novel) => {
      this.addBookmark(novel);
    });

    window['uploadBookmarks'] = this.uploadBookmarks.bind(this);
    window['bookmarkProvider'] = this;

    this.storage.get(ST_BOOKMARK_NOVEL_LAST_READ).then(val => this.novelsLastRead = val || {})
    this.storage.get(ST_BOOKMARK_NOVEL_MAX_CHAPTER).then(val => this.novelsMaxChapter = val || {})
    this.storage.get(ST_BOOKMARK_NOVEL_WAS_UPTODATE).then(val => this.novelsWasUptodate = val || {})


    this.events.subscribe('update:novel', async (novel: Novel) => {
      const currentPr = novel.getCurrentChapter();
      const maxPr = novel.getMaxChapter();
      this.novelsLastRead[novel.id] = await currentPr;
      this.novelsMaxChapter[novel.id] = await maxPr;

      if (this.novelsLastRead[novel.id] === this.novelsMaxChapter[novel.id]) {
        this.novelsWasUptodate[novel.id] = true;
      } else {
        this.novelsWasUptodate[novel.id] = false;
      }
      this.storage.set(ST_BOOKMARK_NOVEL_LAST_READ, this.novelsLastRead);
      this.storage.set(ST_BOOKMARK_NOVEL_MAX_CHAPTER, this.novelsMaxChapter);
      this.storage.set(ST_BOOKMARK_NOVEL_WAS_UPTODATE, this.novelsWasUptodate);
    });

    this.events.subscribe('checkupdate:bookmarks', async () => {
      console.log('event :: checkupdate:bookmarks');
      const bks = await this.bookmarks();
      let cnt = 1;
      for (let id in bks) {
        let novel = this.b2novel(id, bks);
        let novelCurrentChapter = this.novelsLastRead[novel.id];
        let novelMaxChapter = await novel.getMaxChapter();

        if (novelCurrentChapter === novelMaxChapter) {
          this.novelsWasUptodate[novel.id] = true;
        } else if (novelCurrentChapter < novelMaxChapter) {
          this.novelsWasUptodate[novel.id] = false;
        } else {
          if (this.novelsWasUptodate[novel.id] === true) {
            this.events.publish('updated:novel', cnt, novel, novelMaxChapter);
            this.novelsWasUptodate[novel.id] = false;
            cnt += 1;
          }
        }

        await this.storage.set(ST_BOOKMARK_NOVEL_WAS_UPTODATE, this.novelsWasUptodate);
      }
    });

    // window['test1'] = async () => {
    //   const bks = await this.bookmarks();
    //   for (let id in bks) {
    //     let novel = this.b2novel(id, bks);
    //     let novelMaxChapter = await novel.getMaxChapter();
    //     this.events.publish('updated:novel', 1, bks[id], novelMaxChapter);
    //     break;
    //   }
    // }
  }

  textToast(text: string, time: number = 2000) {
    this.events.publish('toast', text, time);
  }

  async getVersion() {
    // caching the version to not execute the async check everytime
    if (this._version === null) {
      this._version = await this.storage.get(ST_BOOKMARK_VERSION);
    }
    return this._version;
  }

  async checkVersion() {
    const bkVersion = await this.getVersion();
    // check version
    if (bkVersion !== null && bkVersion === BK_VERSION) {
      return;
    }
    // update version
    await this.storage.set(ST_BOOKMARK_VERSION, BK_VERSION);
    console.log(`NEW BOOKMARK VERSION ${bkVersion} -> ${BK_VERSION}`);
    const bookmarks = await this.storage.get(ST_BOOKMARK);
    if (bookmarks === null)
      return;

    await this.storage.set(ST_BOOKMARK, bookmarks);
  }

  async updateBk(bookmarks) {
    for (let key in bookmarks) {
      let bk = bookmarks[key];

      if (bk.metas['Last Read'] === bk.metas['Last Released']) {
        bk['_isUpToDate'] = true;
      } else {
        bk['_isUpToDate'] = false;
      }
    }
  }

  b2novel(key: string, dict: any): Novel {
    let bookmark = dict[key];
    let novel = this.novelService.novelKwargs(bookmark);
    return novel;
  }

  sortBookmarks(bookmarks) {
    const keys = Object.keys(bookmarks);
    // sort by most recent added (could also revert the list I guess?)
    keys.sort((a, b) => {
      return bookmarks[b].dateAdded - bookmarks[a].dateAdded;
    });
    return keys
  }

  async getMoreMeta(bookmarks): Promise<any> {
    const a = (id) => {
      let novel = this.b2novel(id, bookmarks);
      return novel.getMoreMeta(true).then((meta) => {
        bookmarks[id].metas = meta;
      })
    }
    if (bookmarks) {
      const promises = [];
      for (let key of this.sortBookmarks(bookmarks)) {
        promises.push(
          a(key)
        );
      }
      await Promise.all(promises);
    }
  }

  async bookmarks(): Promise<any> {
    await this.checkVersion();
    return (await this.storage.get(ST_BOOKMARK)) || {};
  }

  async addBookmark(novel: Novel) {
    console.log('add bookmark', novel.id);
    const cachedBm = await this.bookmarks();
    if (cachedBm[novel.id] === undefined) {
      this.ga.trackEvent('bookmark', 'add-bookmark', novel.id);
      cachedBm[novel.id] = novel.meta();
      cachedBm[novel.id].dateAdded = Date.now();
      this.textToast(`Added "${novel.title}" to your bookmarks!`);
      this.storage.set(ST_BOOKMARK, cachedBm);
    } else {
      this.textToast(`"${novel.title}" already bookmarked.`);
      console.log('already bookmarked');
    }
  }

  async remove(bookmark: any) {
    const bs = await this.bookmarks();
    this.ga.trackEvent('bookmark', 'remove-bookmark', bookmark.title);

    delete bs[bookmark.id]
    return this.storage.set(ST_BOOKMARK, bs);
  }

  async checkUpdated() {
    const bookmarks = await this.bookmarks();
    for (let key in bookmarks) {
      const bk = bookmarks[key];

      if (bk['_isUpToDate'] === true) {
        if (bk.metas['Last Read'] < bk.metas['Last Released']) {
          // trigger notification for this bk;
          bk['_isUpToDate'] = false;
        }
      }
    }
  }

  async uploadBookmarks() {
    // for now just print bookmarks to console as json;
    const bookmarks = await this.bookmarks();
    const data = {};
    for (let key in bookmarks) {
      let bk = bookmarks[key];
      data[key] = { currentChapter: await this.storage.get(`${key}-current-chapter`) };
    }
    const res = {
      bookmarks: bookmarks,
      data: data
    }
    console.log(JSON.stringify(res, null, 2));
  }
}



