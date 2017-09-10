import { Component, Input, Output, EventEmitter } from '@angular/core';

const doubleRaf = () =>
  new Promise(r =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(r)
    )
  )

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
  @Output() selClick =  new EventEmitter();
  @Output() nextClick = new EventEmitter();

  constructor() {
    // console.log('Hello NavBtn Component');
  }

  prev() {
    doubleRaf()
      .then(() => this.prevClick.emit())
  }
  next() {
    doubleRaf()
      .then(() => this.nextClick.emit())
  }
  select() {
    doubleRaf()
      .then(() => this.selClick.emit())
  }

}
