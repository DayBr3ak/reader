import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MyApp } from './app.component';
import { PopoverReadPage } from '../pages/popover-read/popover-read';
import { PopoverChapterPage } from '../pages/popover-chapter/popover-chapter';

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
