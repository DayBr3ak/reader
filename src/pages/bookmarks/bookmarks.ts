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

  didLoad() {
    this.bookmarkProvider.bookmarks().then((bookmarks) => {
      if (bookmarks) {
        this.bookmarkList = bookmarks;
      }
    })
  }

  selNovel(key) {
    let novel = this.bookmarkList[key];
    this.events.publish('change:novel', this.novelService.novelKwargs(novel));
  }

}

