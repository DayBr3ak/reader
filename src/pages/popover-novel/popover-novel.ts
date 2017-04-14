import { Component } from '@angular/core';
import { NavController, NavParams, Events } from 'ionic-angular';
import { Novel } from '../../providers/wuxiaco';

@Component({
  selector: 'page-popover-novel',
  templateUrl: 'popover-novel.html'
})
export class PopoverNovelPage {

  moreDesc: any = {};
  novel: Novel = null;
  novelMeta: any = {};

  constructor(public navCtrl: NavController, public navParams: NavParams,
    public events: Events) {

  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad PopoverNovelPage');
  }

   ngOnInit() {
     if (this.navParams.data) {
       this.novel = this.navParams.data.novel;

       this.novelMeta = [
         ['Author', this.novel.author],
       ]

       this.novel.getMoreMeta(true).then((meta) => {
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
   }

   read() {
     this.events.publish('change:novel', this.novel);
   }

   bookmark() {
     this.events.publish('add:bookmark', this.novel);
   }

   share() {

   }

}
