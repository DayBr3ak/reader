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

  addBookmark(novel: Novel) {
    console.log('add bookmark', novel.id);
    this.ga.trackEvent('bookmark', 'add-bookmark', novel.id);

    let setBM = (v) => {
      v[novel.title] = novel.meta();
      this.textToast(`Added "${novel.title}" to your bookmarks!`);
      return this.storage.set(ST_BOOKMARK, v);
    }

    return this.storage.get(ST_BOOKMARK).then((v) => {
      if (v) {
        return setBM(v);
      } else {
        return setBM({})
      }
    })
  }

  remove(bookmark: any): Promise<any> {
    return this.bookmarks().then((bs) => {
      this.ga.trackEvent('bookmark', 'remove-bookmark', bookmark.title);

      delete bs[bookmark.title]
      return this.storage.set(ST_BOOKMARK, bs);
    })
  }
}



