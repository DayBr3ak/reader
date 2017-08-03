import { Component } from '@angular/core';
import { IonicPage, NavParams, Events } from 'ionic-angular';
import { Brightness } from '@ionic-native/brightness';

IonicPage()
@Component({
  selector: 'page-popover-read',
  templateUrl: 'popover-read.html'
})
export class PopoverReadPage {
  background: string;
  contentEle: any;
  textEle: any;
  fontFamily;

  brightnessValue: number;
  canSetBrightness: boolean;

  fonts = [
    {
      family: 'roboto',
      label: 'Roboto'
    },
    {
      family: 'noto-sans',
      label: 'Noto Sans'
    }
  ];

  constructor(
    private navParams: NavParams,
    private brightness: Brightness,
    public events: Events
  ) {
  }

  async ngOnInit() {
    if (this.navParams.data) {
      this.contentEle = this.navParams.data.contentEle;
      this.textEle = this.navParams.data.textEle;

      this.background = this.navParams.data.bgClass;
      this.setFontFamily();

      this.brightnessValue = 50;
      this.canSetBrightness = true;
      try {
        this.brightnessValue = Math.floor((await this.brightness.getBrightness()) * 100);
      } catch(error) {
        this.canSetBrightness = false;
      }
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
    if (this.fontFamily)
      this.textEle.style.fontFamily = this.fontFamily;
  }

  changeRange(event) {
    if (this.canSetBrightness)
      this.brightness.setBrightness(this.brightnessValue / 100.0);
  }
}
