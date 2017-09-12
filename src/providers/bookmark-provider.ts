import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { PlatformManager } from './platformManager';
import { Novel } from './novel';

const ST_BOOKMARK = 'app-bookmarks';
const ST_BOOKMARK_VERSION = 'app-bookmarks-version';
const ST_BOOKMARK_NOVEL_WAS_UPTODATE = 'app-bookmarks-was-uptodate';
const BK_VERSION = 1.8;

type NovelUpMap = {
  novelId: string,
  wasUptodate: boolean
};

export interface IBookmark {
  id: string;
  title: string;
  _platform: string;

  author?: string;
  desc?: string;
  dateAdded?: number;
}

export type IBookmarkMap = { [id: string] : IBookmark; };
export type IBookmarkMeta = { [id: string] : any; };


@Injectable()
export class BookmarkProvider {
  private _version: number = null;
  private novelsWasUptodate: NovelUpMap;

  constructor(
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

    this.storage.get(ST_BOOKMARK_NOVEL_WAS_UPTODATE).then(val => this.novelsWasUptodate = val || {})

    this.events.subscribe('checkupdate:bookmarks', async () => {
      this.checkUpdateBookmarks();
    });
  }

  textToast(text: string, time: number = 2000) {
    this.events.publish('toast', text, time);
  }

  async updateNovel(novel: Novel) {
    const currentPr = novel.getCurrentChapter();
    const maxPr = novel.getMaxChapter();
    const currentChapter = await currentPr;
    const maxChapter = await maxPr;

    if (currentChapter === maxChapter) {
      this.novelsWasUptodate[novel.id] = true;
    } else {
      this.novelsWasUptodate[novel.id] = false;
    }
    await this.storage.set(ST_BOOKMARK_NOVEL_WAS_UPTODATE, this.novelsWasUptodate);
  }

  async checkUpdateBookmarks() {
    console.log('event :: checkupdate:bookmarks');
    const bks = await this.bookmarks();
    let cnt = 1;

    const promises = Object.keys(bks).map(async id => {
      let novel = this.b2novel(id, bks);
      if (this.novelsWasUptodate[novel.id] === true) {

        let novelCurrentChapter = await novel.getCurrentChapter();
        let novelMaxChapter = await novel.getMaxChapter();

        if (!novelCurrentChapter) {
          console.log('checkupdate:bookmarks :: currentChapter is null/undef ?');
          return;
        }
        if (!novelMaxChapter) {
          console.log('checkupdate:bookmarks :: maxChapter is null/undef ?');
          return;
        }

        if (novelCurrentChapter < novelMaxChapter) {
          console.log(`${novel.title} has an update available!`);
          this.events.publish('updated:novel', cnt, bks[novel.id], novelMaxChapter);
          cnt += 1;
          this.novelsWasUptodate[novel.id] = false;

          // should cache the new chapter(s) for later offline read
          const chapters = [];
          for (let i = novelCurrentChapter + 1; i <= novelMaxChapter; i++) {
            chapters.push(i)
          }

          await Promise.all(chapters.map(async (chapter) => {
            try {
              let chapterContent = await novel.scrap(chapter);
              novel.cacheChapterContent(chapter, chapterContent);
            } catch(error) {
              console.log('error in precache bookmark', novel.title);
            }
          }))

        } else if (novelCurrentChapter === novelMaxChapter) {
          console.log(`${novel.title} has no updates`);
        } else {
          console.error(`${novel.title} current chapter is higher than max chapter`);
        }
      } else {
        console.log(`${novel.title} don't need to be checked.`);
      }
    })
    await Promise.all(promises);
    await this.storage.set(ST_BOOKMARK_NOVEL_WAS_UPTODATE, this.novelsWasUptodate);
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

  b2novel(key: string, dict: any): Novel {
    let bookmark = dict[key];
    let novel = this.novelService.novelKwargs(bookmark);
    return novel;
  }

  sortBookmarks(bookmarks: IBookmarkMap): Array<string> {
    const keys = Object.keys(bookmarks);
    // sort by most recent added (could also revert the list I guess?)
    keys.sort((a, b) => {
      return bookmarks[b].dateAdded - bookmarks[a].dateAdded;
    });
    return keys
  }

  async getMoreMeta(bookmarks): Promise<IBookmarkMeta> {
    const bookmarksMeta = {};

    const a = (id) => {
      let novel = this.b2novel(id, bookmarks);
      return novel.getMoreMeta(true).then((meta) => {
        bookmarksMeta[id] = meta;
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
    return bookmarksMeta;
  }

  async bookmarks(): Promise<IBookmarkMap> {
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

  async remove(bookmark: IBookmark): Promise<IBookmarkMap> {
    const bs = await this.bookmarks();
    this.ga.trackEvent('bookmark', 'remove-bookmark', bookmark.title);

    delete bs[bookmark.id];
    return this.storage.set(ST_BOOKMARK, bs);
  }

  async uploadBookmarks() { // TODO
    // for now just print bookmarks to console as json;
    const bookmarks = await this.bookmarks();
    const data = {};
    for (let key in bookmarks) {
      data[key] = {
        currentChapter: await this.storage.get(`${key}-current-chapter`)
      };
    }
    const res = {
      bookmarks: bookmarks,
      data: data
    }
    console.log(JSON.stringify(res, null, 2));
  }
}



