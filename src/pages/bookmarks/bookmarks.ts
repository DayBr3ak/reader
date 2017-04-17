
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';

import { Wuxiaco, Novel } from '../../providers/wuxiaco';
import { BookmarkProvider } from '../../providers/bookmark-provider';

@IonicPage()
@Component({
  selector: 'page-bookmarks',
  templateUrl: 'bookmarks.html'
})
export class BookmarksPage {

  bookmarkList: any = {};

  get bookmarkKeys() {
    return Object.keys(this.bookmarkList);
  }

  moreDesc: any = {};

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private storage: Storage,
    private toastCtrl: ToastController,
    private events: Events,
    private novelService: Wuxiaco,
    private bookmarkProvider: BookmarkProvider
  ) {

  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  ionViewDidEnter() {
    window['thiz'] = this;
    console.log('ionViewDidLoad BookmarksPage');
    this.storage.ready().then(() => {
      this.didLoad();
    });
  }

  _formatMeta(key: string) {
     let bookmark = this.bookmarkList[key];
     if (!bookmark.metas)
       return [];

     let ar = Object.keys(bookmark.metas);
     let res = []
     for (let i = 0; i < ar.length; i++) {
       let key = ar[i];
       if (key[0] === '_') continue;
       let item = bookmark.metas[key];
       res.push([key, item]);
     }

     return res;
  }

  async didLoad() {
    const bookmarks = await this.bookmarkProvider.bookmarks();
    if (bookmarks) {
      this.bookmarkList = bookmarks;
      this.bookmarkKeys.forEach(async (key) => {
        let bookmark = this.bookmarkList[key];
        let novel: Novel = this.novelService.novelKwargs(bookmark);
        try {
          bookmark.metas = await novel.getMoreMeta(true);
        } catch (error) {
          console.log(error);
          this.textToast('You have no internet access :(')
        }
      });
    }
  }

  b2novel(key: string): Novel {
    let bookmark = this.bookmarkList[key];
    let novel = this.novelService.novelKwargs(bookmark);
    return novel;
  }

  read(key: string) {
    let novel = this.b2novel(key);
    this.events.publish('change:novel', novel);
  }

  remove(key: string) {
    let bookmark = this.bookmarkList[key];
    this.bookmarkProvider.remove(bookmark).then((newBookmarks) => {
      this.bookmarkList = newBookmarks;
    })
  }

  download(key: string) {
    let novel = this.b2novel(key);
    let finish = (downloaded) => {
      this.textToast(`Downloaded ${downloaded} chapters of '${novel.title}'`);
    };
      // this.loadAhead(1, this.maxChapter, this.maxChapter, null, finish);
    novel.download().then(finish);
  }

  rm (key: string) {
    let novel = this.b2novel(key);
    novel.removeDownload().then(() => {
      console.log('deleted')
      this.textToast(`Deleted offline data of '${novel.title}'`);
    });
  }
}

