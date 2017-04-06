import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { ReadingPage } from '../pages/reading/reading';
import { ReadModalPage } from '../pages/read-modal/read-modal';
import { SettingsPage } from '../pages/settings/settings';
import { PopoverReadPage } from '../pages/popover-read/popover-read';


import { IonicStorageModule } from '@ionic/storage';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

@NgModule({
  declarations: [
    MyApp,
    ReadingPage,
    ReadModalPage,
    SettingsPage,
    PopoverReadPage
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
    PopoverReadPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
