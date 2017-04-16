import { NgModule, ModuleWithProviders } from '@angular/core';
import { IonicModule } from 'ionic-angular';

import { NavBtn } from './nav-btn';

/** @hidden */
@NgModule({
  imports: [
    IonicModule
  ],
  declarations: [
    NavBtn
  ],
  exports: [
    NavBtn
  ]
})
export class NavBtnModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: NavBtnModule, providers: []
    };
  }
}