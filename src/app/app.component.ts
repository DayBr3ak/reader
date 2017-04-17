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

    window.gaTrackerStarted = new Promise((resolve, reject) => {
      platform.ready().then(() => {
        ga.startTrackerWithId("UA-97415917-1").then((data) => {
          console.log('Google Analytics Tracker started', data);
          ga.setAppVersion(appVersion);
          resolve(true);
        }, (err) => {
          console.log('Google Analytics', err);
          resolve(false);
        })
      });
    });

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
      this.events = events;

      this.pages = [
        { title: 'Explore', component: 'ExplorePage' },
        { title: 'Back To Reading', component: 'ReadingPage' },
        { title: 'Bookmarks', component: 'BookmarksPage' },
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
        this.nav.setRoot('ReadingPage', { novel: novel });
      })

    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}
