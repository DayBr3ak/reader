import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Events, ToastController } from 'ionic-angular';
import 'rxjs/add/operator/map';
import { Storage } from '@ionic/storage';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { Novel } from './wuxiaco';

const ST_BOOKMARK = 'app-bookmarks';

@Injectable()
export class BookmarkProvider {

  constructor(public http: Http,
    public events: Events,
    public storage: Storage,
    public toastCtrl: ToastController,
    private ga: GoogleAnalytics
  ) {
    console.log('Hello BookmarkProvider Provider');

    this.events.subscribe('add:bookmark', (novel: Novel) => {
      this.addBookmark(novel);
    })
  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  bookmarks(): Promise<any> {
    return this.storage.get(ST_BOOKMARK);
  }

  async addBookmark(novel: Novel) {
    console.log('add bookmark', novel.id);
    this.ga.trackEvent('bookmark', 'add-bookmark', novel.id);

    const cachedBm = await this.bookmarks() || {};
    cachedBm[novel.title] = novel.meta();
    this.textToast(`Added "${novel.title}" to your bookmarks!`);
    this.storage.set(ST_BOOKMARK, cachedBm);
  }

  async remove(bookmark: any) {
    const bs = await this.bookmarks();
    this.ga.trackEvent('bookmark', 'remove-bookmark', bookmark.title);

    delete bs[bookmark.title]
    return this.storage.set(ST_BOOKMARK, bs);
  }
}



