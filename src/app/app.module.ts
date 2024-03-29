import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MyApp } from './app.component';
import { PopoverReadPage } from '../pages/popover-read/popover-read';
import { PopoverChapterPage } from '../pages/popover-chapter/popover-chapter';

import { PlatformManager } from '../providers/platformManager';
import { HttpModule } from '@angular/http';

import { BookmarkProvider } from '../providers/bookmark-provider';
import { ReaderProvider } from   '../providers/reader-provider';
import { MyHttpProvider } from '../providers/my-http-provider'

import { IonicStorageModule } from '@ionic/storage';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { GoogleAnalytics } from '@ionic-native/google-analytics';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { Brightness } from '@ionic-native/brightness';
import { HTTP as CordovaHttp } from '@ionic-native/http';

@NgModule({
  declarations: [
    MyApp,
    PopoverReadPage,
    PopoverChapterPage,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot(),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    PopoverReadPage,
    PopoverChapterPage,
  ],
  providers: [
    PlatformManager,
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    GoogleAnalytics,
    LocalNotifications,
    Brightness,
    CordovaHttp,
    BookmarkProvider,
    ReaderProvider,
    MyHttpProvider,
  ]
})
export class AppModule {}
