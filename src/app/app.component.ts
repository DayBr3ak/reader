import { Component, ViewChild } from '@angular/core';
import { Platform, Nav, Events, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import { SplashScreen } from '@ionic-native/splash-screen';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { Novel } from '../providers/novel'
const appVersion = '0.2';

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
    public localNotifications: LocalNotifications,
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
    await this.storage.ready();

    // Okay, so the platform is ready and our plugins are available.
    // Here you can do any higher level native things you might need.
    this.statusBar.styleDefault();

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

    this.events.subscribe('updated:novel', (notifId: number, bookmark: any, newMaxChapter: number) => {
      this.localNotifications.schedule({
        id: notifId,
        text: `${bookmark.title}: New Chapter (${newMaxChapter})`,
        data: bookmark
      });

      console.log(bookmark);
    })

    this.localNotifications.on('click', (notification: any) => {
      this.platform.zone.run(() => {
        this.events.publish('change:novel', JSON.parse(notification.data));
      })
    })

    setTimeout(() => {
      this.events.publish('checkupdate:bookmarks');
    }, 2000);
    setInterval(() => {
      this.events.publish('checkupdate:bookmarks');
    }, 60 * 60 * 1000);

    this.events.subscribe('toggle:splashscreen', () => {
      console.log('hide splashscreen');
      this.splashScreen.hide();
    });
  }

  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}
