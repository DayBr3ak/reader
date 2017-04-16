import { Component, ViewChild } from '@angular/core';
import { Platform, Nav, Events } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { GoogleAnalytics } from '@ionic-native/google-analytics';

declare var window: any;
const appVersion = '0.1a';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage:any = 'ReadingPage';
  pages:any;
  events: any;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    events: Events,
    ga: GoogleAnalytics
  ) {

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
      this.events = events;

      window.gaTrackerStarted = new Promise((resolve, reject) => {
        ga.startTrackerWithId("UA-97415917-1").then((data) => {
          console.log('Google Analytics Tracker started', data);
          ga.setAppVersion(appVersion);
          resolve(true);
        }, (err) => {
          console.log('Google Analytics', err);
          resolve(false);
        })
      });

      this.pages = [
        { title: 'Explore', component: 'ExplorePage' },
        { title: 'Back To Reading', component: 'ReadingPage' },
        { title: 'Bookmarks', component: 'BookmarksPage' },
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

      //Registration of push in Android and Windows Phone
      platform.registerBackButtonAction(() => {
        if (this.nav.canGoBack()){ //Can we go back?
          this.nav.pop();
        }else{
          // platform.exitApp(); //Exit from app
          // this.nav.setRoot(ReadingPage);
          // do nothing
        }
      });

      events.subscribe('change:novel', (novel) => {
        this.nav.setRoot('ReadingPage', { novel: novel });
      })

    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    let param = null;
    if (page.component == 'ReadingPage')
      param = page.novel;
    this.nav.setRoot(page.component, page);
      // this.events.publish('change:novel', page.novel);
  }
}
