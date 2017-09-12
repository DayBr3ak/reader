
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, Events } from 'ionic-angular';

import { Novel } from '../../providers/novel';
import { BookmarkProvider, IBookmark, IBookmarkMap, IBookmarkMeta } from '../../providers/bookmark-provider';

@IonicPage()
@Component({
  selector: 'page-bookmarks',
  templateUrl: 'bookmarks.html'
})
export class BookmarksPage {
  moreDesc: any = {};
  bookmarkList: IBookmarkMap = {};
  bookmarkMeta: IBookmarkMeta = {};
  get bKeys() {
    return this.bookmarkProvider.sortBookmarks(this.bookmarkList);
  }

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private toastCtrl: ToastController,
    private events: Events,
    private bookmarkProvider: BookmarkProvider
  ) {
    this.didLoad();
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
  }

  _formatMeta(key: string) {
     let meta = this.bookmarkMeta[key];
     if (!meta)
       return [];

     let ar = Object.keys(meta);
     let res = []
     for (let i = 0; i < ar.length; i++) {
       let key = ar[i];
       if (key[0] === '_') continue;
       let item = meta[key];
       res.push([key, item]);
     }

     return res;
  }

  b2novel(key: string): Novel {
    return this.bookmarkProvider.b2novel(key, this.bookmarkList);
  }

  async didLoad() {
    this.bookmarkList = await this.bookmarkProvider.bookmarks();
    try {
      this.bookmarkMeta = await this.bookmarkProvider.getMoreMeta(this.bookmarkList);
    } catch (error) {
      console.log(error);
      this.textToast('You have no internet access :(')
    }
  }

  read(key: string) {
    let novel = this.b2novel(key);
    this.events.publish('change:novel', novel);
  }

  async remove(key: string) {
    let bookmark = this.bookmarkList[key];
    this.bookmarkList = await this.bookmarkProvider.remove(bookmark);
  }

  async download(key: string) {
    let novel = this.b2novel(key);
    const downloaded = await novel.download();
    this.textToast(`Downloaded ${downloaded} chapters of '${novel.title}'`);
  }

  rm (key: string) {
    let novel = this.b2novel(key);
    novel.removeDownload().then(() => {
      console.log('deleted')
      this.textToast(`Deleted offline data of '${novel.title}'`);
    });
  }

  isChecking = false;
  async checkUpdate() {
    if (this.isChecking) {
      return;
    }
    this.isChecking = true;
    this.textToast('Started Checking for Updates', 1000);
    try {
      await this.bookmarkProvider.checkUpdateBookmarks();
      this.textToast('Finished checking for updates');
    } catch(error) {
      this.textToast('Got an error somehow')
    }
    this.isChecking = false;
  }
}

