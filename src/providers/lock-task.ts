import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';

@Injectable()
export class LockTask {

  private _locktask: any = null;

  constructor(private plt: Platform) {
    plt.ready().then(() => {
      if (plt.is('cordova'))
        this._locktask = (<any>window).plugins.locktask;
    })
  }

  private _noCordova(): Promise<any> {
    return Promise.reject('No Cordova');
  }

  start(className?: string): Promise<any> {
    if (this._locktask === null)
      return this._noCordova();
    return new Promise((resolve, reject) => {
      this._locktask.startLockTask(
        (success) => resolve(success),
        (error) => reject(error),
        className
      );
    })
  }

  stop(): Promise<any> {
    if (this._locktask === null)
      return this._noCordova();
    return new Promise((resolve, reject) => {
      this._locktask.stopLockTask(
        (success) => resolve(success),
        (error) => reject(error)
      );
    })
  }
}
