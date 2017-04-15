import { Component } from '@angular/core';
import { NavController, NavParams, Events, ToastController } from 'ionic-angular';

import { Novel } from '../../providers/wuxiaco';

@Component({
  selector: 'page-popover-novel',
  templateUrl: 'popover-novel.html'
})
export class PopoverNovelPage {

  moreDesc: any = {};
  novel: Novel = null;
  novelMeta: any = [];
  novelMetaDict: any = {};
  origin: string;
  isDownloaded: boolean;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    public events: Events,
    public toastCtrl: ToastController
  ) {

  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad PopoverNovelPage');
  }

  ngOnInit() {
    if (this.navParams.data) {
      this.novel = this.navParams.data.novel;
      this.origin = this.navParams.data.origin;

      this.novelMeta = [
        ['Author', this.novel.author],
      ]

      this.novel.getMoreMeta(true).then((meta) => {
        this.novelMetaDict = meta;
        let ar = Object.keys(meta);
        for (let i = 0; i < ar.length; i++) {
          let key = ar[i];
          if (key[0] === '_') continue;
          let item = meta[key];
          this.novelMeta.push([key, item]);
        }
      });
    }
    window['thiz'] = this;
    this.isDownloaded = false;
  }

  read() {
    this.events.publish('change:novel', this.novel);
  }

  bookmark() {
    this.events.publish('add:bookmark', this.novel);
  }

  share() {
    console.log(this.novelMetaDict);
  }

  download() {
    let finish = (downloaded) => {
      this.textToast(`Downloaded ${downloaded} chapters of '${this.novel.title}'`);
    };
      // this.loadAhead(1, this.maxChapter, this.maxChapter, null, finish);
    this.novel.download().then(finish);
  }

  rm () {
    this.novel.removeDownload().then(() => {
      console.log('deleted')
      this.textToast(`Deleted offline data of '${this.novel.title}'`);
    });
  }
}
