import { Observable } from 'rxjs';

export class MultiTapHandler {

  private tapRequired: number;
  private windowOf: number;
  private tapObservable: Observable<any>;
  private tapObserver: any = null;
  private timeoutHandle: number = null;
  private tapCounter: number = 0;

  constructor (tapRequired: number=2, windowOf: number=600) {
    if (tapRequired < 1) {
      throw 'MultiTapHandler needs at least 1 tap';
    }
    this.tapRequired = tapRequired;
    this.windowOf = windowOf;
    this.tapObservable = Observable.create(observer => {
      this.tapObserver = observer;
      return () => {
        console.log('taphandler disposed');
      }
    });
  }

  private _cancelTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.tapCounter = 0;
  }

  private _createTimeout() {
    this.timeoutHandle = window.setTimeout(() => {
      this._cancelTimeout();
      console.log('taphandler timeout')
    }, this.windowOf);
  }

  private _publish() {
    this._cancelTimeout();
    this.tapObserver.next(true);
  }

  tap () {
    if (this.tapRequired === 1) {
      return this._publish();
    }
    if (this.timeoutHandle === null) {
      // first tap, enable timer
      return this._createTimeout();
    }
    if (this.timeoutHandle) {
      this.tapCounter++;
      if (this.tapCounter >= (this.tapRequired - 1)) {
        this._publish();
      }
    }
  }

  get observable(): Observable<any> {
    return this.tapObservable;
  }
}
