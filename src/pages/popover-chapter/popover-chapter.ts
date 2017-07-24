import { Component } from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';

/*
  Generated class for the PopoverChapter page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-popover-chapter',
  templateUrl: 'popover-chapter.html'
})
export class PopoverChapterPage {

  maxChapter: number;
  currentChapter: number;

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController
   ) {
    this.maxChapter = navParams.data.max;
    this.currentChapter = navParams.data.current;
  }

  ionViewDidLoad() {
    // console.log('ionViewDidLoad PopoverChapterPage');
  }

  validate(input) {
    this.viewCtrl.dismiss(parseInt(input.value));
  }

  gotoLast() {
    this.viewCtrl.dismiss('last');
  }

  gotoFirst() {
    this.viewCtrl.dismiss('first');
  }

}
