import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MyApp } from './app.component';
// import { ReadingPage } from '../pages/reading/reading';
// import { ReadModalPage } from '../pages/read-modal/read-modal';
// import { SettingsPage } from '../pages/settings/settings';
import { PopoverReadPage } from '../pages/popover-read/popover-read';
import { PopoverChapterPage } from '../pages/popover-chapter/popover-chapter';
// import { ExplorePage } from '../pages/explore/explore';
// import { BookmarksPage } from '../pages/bookmarks/bookmarks';
// import { PopoverNovelPage } from '../pages/popover-novel/popover-novel';

import { NavBtn } from '../components/nav-btn/nav-btn';
import { Wuxiaco } from '../providers/wuxiaco';
import { HttpModule } from '@angular/http';

import { BookmarkProvider } from '../providers/bookmark-provider';
import { LockTask } from '../providers/lock-task';

import { IonicStorageModule } from '@ionic/storage';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

@NgModule({
  declarations: [
    MyApp,
    NavBtn,
    PopoverReadPage,
    PopoverChapterPage
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    NavBtn,
    PopoverReadPage,
    PopoverChapterPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    GoogleAnalytics,
    Wuxiaco,
    BookmarkProvider,
    LockTask
  ]
})
export class AppModule {}
