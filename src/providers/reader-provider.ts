
import { Injectable } from '@angular/core';
import { Events, Platform } from 'ionic-angular';
import { ReadingPage } from '../pages/reading/reading';

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

  viewInactive(currentView: ReadingPage) {
    if (currentView.timestamp < this.view.timestamp) {
      // bug, this function is called after the new view is set with setView, so nulling the view cause an error;
      // (only when view is reloaded)
      return;
    }
    console.log('view inactive')
    this.view = null;
  }

  registerEvents() {
    this.events.subscribe('volume:up', () => {
      if (this.view)
        this.platform.zone.run(() => {
          this.view.onPreviousChapter();
        });
    })

    this.events.subscribe('volume:down', () => {
      if (this.view)
        this.platform.zone.run(() => {
          this.view.onNextChapter();
        });
    })

    this.events.subscribe('change:background', (bg) => {
      this.view && this.view.onBackGroundChange(bg);
    })

    this.platform.pause.subscribe(() => {
      this.view && this.view.onPause();
    })
  }
}

