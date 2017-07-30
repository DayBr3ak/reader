import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Events } from 'ionic-angular';
import 'rxjs/add/operator/map';
import { Storage } from '@ionic/storage';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { Novel } from './novel';

const ST_BOOKMARK = 'app-bookmarks';
const ST_BOOKMARK_VERSION = 'app-bookmarks-version';
const BK_VERSION = 1.1;

@Injectable()
export class BookmarkProvider {
  private _version: number = null;

  constructor(public http: Http,
    public events: Events,
    public storage: Storage,
    private ga: GoogleAnalytics
  ) {
    console.log('Hello BookmarkProvider Provider');

    this.events.subscribe('add:bookmark', (novel: Novel) => {
      this.addBookmark(novel);
    });

    window['uploadBookmarks'] = this.uploadBookmarks.bind(this);
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

    // apply version changes for null to 1.1
    for (let key in bookmarks) {
      const bookmark = bookmarks[key];
      bookmarks[bookmark.id] = bookmarks[bookmark.title];
      bookmark.dateAdded = Date.now(); // sort by date added
      delete bookmarks[bookmark.title];
    }
    await this.storage.set(ST_BOOKMARK, bookmarks);
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

  async isUpdated() {
    const bookmarks = await this.bookmarks();
    for (let bookmarkId in bookmarks) {
      const bookmark = bookmarks[bookmarkId];
      //todo
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



