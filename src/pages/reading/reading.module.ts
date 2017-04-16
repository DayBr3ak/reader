import { NgModule } from '@angular/core';
import { ReadingPage } from './reading';
import { IonicPageModule } from 'ionic-angular';

@NgModule({
  declarations: [
    ReadingPage,
  ],
  imports: [ IonicPageModule.forChild(ReadingPage) ],
})
export class ReadingPageModule {

}
