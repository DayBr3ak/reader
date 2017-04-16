import { NgModule } from '@angular/core';
import { ReadingPage } from './reading';
import { IonicPageModule } from 'ionic-angular';
import { NavBtnModule } from '../../components/nav-btn/nav-btn.module';


@NgModule({
  declarations: [
    ReadingPage,
  ],
  imports: [
    IonicPageModule.forChild(ReadingPage),
    NavBtnModule,
  ],
})
export class ReadingPageModule {

}
