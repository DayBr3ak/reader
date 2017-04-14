// 33 Warlock
// 422 mga

import { Component } from '@angular/core';
import { NavController, NavParams, ToastController, Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';

import { Wuxiaco, Novel } from '../../providers/wuxiaco';
import { BookmarkProvider } from '../../providers/bookmark-provider';

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

  didLoad() {
    this.bookmarkProvider.bookmarks().then((bookmarks) => {
      if (bookmarks) {
        this.bookmarkList = bookmarks;


        this.bookmarkKeys.forEach((key) => {
          let bookmark = this.bookmarkList[key];
          let novel: Novel = this.novelService.novelKwargs(bookmark);
          novel.getMoreMeta(true).then((metas) => {
            bookmark.metas = metas;
          })
        })

      }
    })
  }

  read(key: string) {
    let bookmark = this.bookmarkList[key];
    this.events.publish('change:novel', this.novelService.novelKwargs(bookmark));
  }

  remove(key: string) {
    let bookmark = this.bookmarkList[key];
    this.bookmarkProvider.remove(bookmark).then((newBookmarks) => {
      this.bookmarkList = newBookmarks;
    })
  }

}

