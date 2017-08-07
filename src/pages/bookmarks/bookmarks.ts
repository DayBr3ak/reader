
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';

// import { Wuxiaco } from '../../providers/wuxiaco';
import { NovelPlatform } from '../../providers/novelPlatform';
import { PlatformManager } from '../../providers/platformManager';
import { Novel } from '../../providers/novel';
import { BookmarkProvider } from '../../providers/bookmark-provider';

@IonicPage()
@Component({
  selector: 'page-bookmarks',
  templateUrl: 'bookmarks.html'
})
export class BookmarksPage {
  moreDesc: any = {};
  bookmarkList: any = {};
  get bKeys() {
    return this.bookmarkProvider.sortBookmarks(this.bookmarkList);
  }

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private storage: Storage,
    private toastCtrl: ToastController,
    private events: Events,
    private bookmarkProvider: BookmarkProvider
  ) {

    // window['updateBk'] = () => {
    //   this.bookmarkProvider.updateBk(this.bookmarkList);
    // }
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

  b2novel(key: string): Novel {
    return this.bookmarkProvider.b2novel(key, this.bookmarkList);
  }

  async didLoad() {
    this.bookmarkList = await this.bookmarkProvider.bookmarks();
    try {
      this.bookmarkProvider.getMoreMeta(this.bookmarkList);
    } catch (error) {
      console.log(error);
      this.textToast('You have no internet access :(')
    }

    this.events.publish('checkupdate:bookmarks'); // FIXME
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

