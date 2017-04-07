import { Component } from '@angular/core';
import { NavParams, Events } from 'ionic-angular';

@Component({
  selector: 'page-popover-read',
  templateUrl: 'popover-read.html'
})
export class PopoverReadPage {
  background: string;
  contentEle: any;
  textEle: any;
  fontFamily;

  fonts = [
    {
      family: 'roboto',
      label: 'Roboto'
    },
    {
      family: 'arial',
      label: 'Arial'
    }
  ];

  constructor(
    private navParams: NavParams,
    public events: Events
  ) {

  }

  ngOnInit() {
    if (this.navParams.data) {
      this.contentEle = this.navParams.data.contentEle;
      this.textEle = this.navParams.data.textEle;

      this.background = this.navParams.data.bgClass;
      this.setFontFamily();
    }
  }

  setFontFamily() {
    if (this.textEle.style.fontFamily) {
      this.fontFamily = this.textEle.style.fontFamily.replace(/'/g, "");
    }
  }

  changeBackground(color) {
    this.background = color;
    this.events.publish('change:background', color);
  }

  changeFontSize(direction) {
    let getFontSize = (unit) => {
      let sz = this.textEle.style.fontSize.replace(unit, '');
      return parseFloat(sz);
    }

    let setFontSize = (unit, val) => {
      this.textEle.style.fontSize = '' + val + unit;
    }

    let delta = direction === 'smaller'? -.1: .1;
    setFontSize('vw', getFontSize('vw') + delta);
  }

  changeFontFamily() {
    if (this.fontFamily) this.textEle.style.fontFamily = this.fontFamily;
  }
}
