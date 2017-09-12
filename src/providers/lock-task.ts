// import { Injectable } from '@angular/core';
// import { Platform } from 'ionic-angular';

// declare var window: any;

// @Injectable()
// export class LockTask {

//   constructor(private plt: Platform) {

//   }

//   get locktaskPromise(): Promise<any> {
//     return this.plt.ready().then(() => {
//       if (this.plt.is('cordova') && this.plt.is('android'))
//         return window.plugins.locktask;
//       throw 'No Cordova or Android';
//     });
//   }

//   start(className?: string): Promise<any> {
//     return this.locktaskPromise.then((locktask) => {
//       return new Promise((resolve, reject) => {
//         locktask.startLockTask(
//           (success) => resolve(success),
//           (error) => reject(error),
//           className
//         );
//       })
//     });
//   }

//   stop(): Promise<any> {
//     return this.locktaskPromise.then((locktask) => {
//       return new Promise((resolve, reject) => {
//         locktask.stopLockTask(
//           (success) => resolve(success),
//           (error) => reject(error)
//         );
//       })
//     });
//   }
// }
