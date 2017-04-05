import { ViewChild, Component } from '@angular/core';
import { NavParams, Platform, ViewController, Content } from 'ionic-angular';

@Component({
  selector: 'page-read-modal',
  templateUrl: 'read-modal.html'
})
export class ReadModalPage {
  modTitle: string;
  max: number;
  chapList: Array<number>;
  @ViewChild(Content) content: Content;

  constructor(
    public platform: Platform,
    public params: NavParams,
    public viewCtrl: ViewController
  ) {
    this.modTitle = 'Choose Chapter';
    this.max = this.params.data.max;
    this.chapList = [];
    this.createList(this.params.data.current);
  }

  ionViewDidEnter() {
    // scroll to chapter
    let selected = this.params.data.current - 3;
    if (selected < 0) {
      selected = 0;
    }

    this.content.scrollTop = document.getElementById(this.createElemId(selected)).offsetTop;
  }

  createElemId(chap) {
    return 'chapter-id-' + chap;
  }

  dismiss() {
    this.viewCtrl.dismiss(null);
  }

  selectCh(chap) {
    this.viewCtrl.dismiss(chap);
  }

  createList(center) {
    const offset = 8;
    let min = center - offset;
    if (min < 1) min = 1;
    let max = center + offset;
    if (max > this.max) max = this.max;

    min = 1;
    max = this.max;
    for (let i = min; i <= max; i++) {
      this.chapList.push(i);
    }
  }

  isSelected(chap) {
    return chap == this.params.data.current;
  }

}