
import { Injectable } from '@angular/core';
import { Events, Platform } from 'ionic-angular';
import { ReadingPage } from '../pages/reading/reading';

const wait = (to: number) => new Promise(r => setTimeout(r, to));

@Injectable()
export class ReaderProvider {

  view: ReadingPage;

  constructor(
    public events: Events,
    public platform: Platform
  ) {
    this.view = null;
    this.registerEvents();
  }

  setView(view: ReadingPage) {
    this.view = view;
  }

  viewInactive(view: ReadingPage) {
    if (this.view != view) {
      return;
    }
    console.log('view inactive')
    this.view = null;
  }

  registerEvents() {
    this.events.subscribe('volume:up', () => {
      this.view && this.view.onPreviousChapter();
    })

    this.events.subscribe('volume:down', () => {
      this.view && this.view.onNextChapter();
    })

    this.events.subscribe('change:background', (bg) => {
      this.view && this.view.onBackGroundChange(bg);
    })

    this.platform.pause.subscribe(() => {
      this.view && this.view.onPause();
    })
  }
}

