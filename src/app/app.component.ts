import { Component, ViewChild } from '@angular/core';
import { Platform, Nav, Events, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import { SplashScreen } from '@ionic-native/splash-screen';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { BookmarkProvider } from '../providers/bookmark-provider';

import { Novel } from '../providers/novel'
const appVersion = '0.2';

const doubleRaf = () =>
  new Promise(r =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(r)
    )
  )

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage:any = 'ReadingPage';
  pages:any;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    public storage: Storage,
    public bookmarkProvider: BookmarkProvider,
    public events: Events,
    public toastCtrl: ToastController,
    public ga: GoogleAnalytics
  ) {
    this.init();
  }

  async init() {

    window['gaTrackerStarted'] = (async () => {
      await this.platform.ready();
      try {
        const data = await this.ga.startTrackerWithId("UA-97415917-1");
        console.log('Google Analytics Tracker started', data);
        this.ga.setAppVersion(appVersion);
        return this.ga;
      } catch (error) {
        console.log('Google Analytics', error);
        return this.ga;
      }
    })();

    await this.platform.ready();
    // Okay, so the platform is ready and our plugins are available.
    // Here you can do any higher level native things you might need.
    this.statusBar.styleDefault();
    this.splashScreen.hide();

    await this.storage.ready();

    this.pages = [
      { title: 'Explore', component: 'ExplorePage' },
      { title: 'Back To Reading', component: 'ReadingPage' },
      { title: 'Bookmarks', component: 'BookmarksPage' },
    ];

    document.addEventListener("volumedownbutton", () => {
      console.log('volumedownbutton');
      this.events.publish('volume:down');
    }, false);

    document.addEventListener("volumeupbutton", () => {
      console.log('volumeupbutton');
      this.events.publish('volume:up');
    }, false);

    this.events.subscribe('change:novel', (novel) => {
      this.nav.setRoot('ReadingPage', { novel: novel });
    })

    this.events.subscribe('toast', (message, time) => {
      let toast = this.toastCtrl.create({
        message: message,
        duration: time
      });
      toast.present();
    })

    this.events.subscribe('toggle:splashscreen', () => {
      console.log('hide splashscreen');
      // this.splashScreen.hide();
    });

    // this.platform.resume.subscribe(() => {
    //   this.events.publish('checkupdate:bookmarks');
    // })

    const subRoutine = {
      start: Date.now(),
      last:  Date.now(),
      count: 0,
      period: 1000,
      data: {
        'last_checked': 0,
        'check_interval': 30 * 60 * 1000, // 30min
        'check_interval_default': 30 * 60 * 1000,
        'check_interval_onfailure': 10 * 60 * 1000
      },
      handler: () => {
        this.platform.timeout(subRoutine.handler, subRoutine.period);
        const now = Date.now();
        const last = subRoutine.last;
        subRoutine.last = now;
        subRoutine.count += 1;
        // console.log('LOGGING subroutine', subRoutine.count, now - last);

        if (now - subRoutine.data['last_checked'] > subRoutine.data['check_interval']) { // 30min
          subRoutine.data['last_checked'] = now;
          this.bookmarkProvider.checkUpdateBookmarks()
            .then(() => {
              subRoutine.data['check_interval'] = subRoutine.data['check_interval_default'];
            })
            .catch(() => {
              subRoutine.data['check_interval'] = subRoutine.data['check_interval_onfailure'];
            })
            .then(() => {
              subRoutine.data['last_checked'] = Date.now();
            })
        }
      }
    }
    subRoutine.handler();
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    doubleRaf().then(() => this.nav.setRoot(page.component))
  }
}
