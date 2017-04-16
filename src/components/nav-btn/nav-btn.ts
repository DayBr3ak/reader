import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'nav-btn',
  templateUrl: 'nav-btn.html'
})
export class NavBtn {

  @Input()
  displayPrevBtn: boolean = true;
  @Input()
  displayNextBtn: boolean = true;
  @Input()
  disable: boolean = false;

  @Output() prevClick = new EventEmitter();
  @Output() selClick = new EventEmitter();
  @Output() nextClick = new EventEmitter();

  constructor() {
    console.log('Hello NavBtn Component');
  }

  prev() {
    this.prevClick.emit();
  }
  next() {
    this.nextClick.next();
  }
  select() {
    this.selClick.emit();
  }

}
