import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { ReadingPage } from '../pages/reading/reading';
import { ReadModalPage } from '../pages/read-modal/read-modal';
import { SettingsPage } from '../pages/settings/settings';
import { PopoverReadPage } from '../pages/popover-read/popover-read';
import { PopoverChapterPage } from '../pages/popover-chapter/popover-chapter';
import { ExplorePage } from '../pages/explore/explore';
import { BookmarksPage } from '../pages/bookmarks/bookmarks';

import { NavBtnComponent } from '../components/nav-btn/nav-btn';
import { Wuxiaco } from '../providers/wuxiaco';

import { IonicStorageModule } from '@ionic/storage';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

@NgModule({
  declarations: [
    MyApp,
    ReadingPage,
    ReadModalPage,
    SettingsPage,
    PopoverReadPage,
    PopoverChapterPage,
    ExplorePage,
    BookmarksPage,
    NavBtnComponent,
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    ReadingPage,
    ReadModalPage,
    SettingsPage,
    PopoverReadPage,
    PopoverChapterPage,
    BookmarksPage,
    ExplorePage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Wuxiaco,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
