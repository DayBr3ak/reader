import { Component, ViewChild } from '@angular/core';
import { Platform, Nav, Events } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { ReadingPage } from '../pages/reading/reading';
import { ExplorePage } from '../pages/explore/explore';
import { SettingsPage } from '../pages/settings/settings';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage:any = ReadingPage;
  pages:any;
  events: any;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    events: Events
  ) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
      this.events = events;

      this.pages = [
        { title: 'Explore', component: ExplorePage },
        // { title: 'MGA', component: ReadingPage, novel: {name: 'MartialGodAsura', id: 'Martial-God-Asura'}},
        // { title: 'TDG', component: ReadingPage, novel: {name: 'TDG', id: 'Tales-of-Demons-and-Gods'}},
        // { title: 'Warlock', component: ReadingPage, novel: {name: 'Warlock-of-the-Magus-World', id: 'Warlock-of-the-Magus-World'}},
        // { title: 'Ancient Godly Monarch', component: ReadingPage, novel: {name: 'Ancient-Godly-Monarch', id: 'Ancient-Godly-Monarch'}},
        // { title: 'Ze-Tian-Ji', component: ReadingPage, novel: {name: 'Ze-Tian-Ji', id: 'Ze-Tian-Ji'}},
        // { title: 'Warlock', component: ReadingPage, novel: {name: 'Warlock-of-the-Magus-World', id: 'Warlock-of-the-Magus-World'}},
        // { title: 'Warlock', component: ReadingPage, novel: {name: 'Warlock-of-the-Magus-World', id: 'Warlock-of-the-Magus-World'}},
      ];


      document.addEventListener("volumedownbutton", () => {
        platform.zone.run(() => {
          events.publish('volume:down');
        });
      }, false);

      document.addEventListener("volumeupbutton", () => {
        platform.zone.run(() => {
          events.publish('volume:up');
        });
      }, false);

      events.subscribe('change:novel', (novel) => {
        this.nav.setRoot(ReadingPage, { novel: novel.meta() });
      })

    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    let param = null;
    if (page.component == ReadingPage)
      param = page.novel;
    this.nav.setRoot(page.component, page);
      // this.events.publish('change:novel', page.novel);
  }
}
