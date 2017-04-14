import { Component } from '@angular/core';
import { NavController, NavParams, ToastController, Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';

import { Wuxiaco } from '../../providers/wuxiaco';
import { ST_BOOKMARK } from '../reading/reading';

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
    private novelService: Wuxiaco
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
    this.storage.get(ST_BOOKMARK).then((v) => {
      if (v) {
        this.bookmarkList = v;
      }
    })
  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  selNovel(key) {
    let novel = this.bookmarkList[key];
    this.events.publish('change:novel', this.novelService.novelKwargs(novel));
  }

}

