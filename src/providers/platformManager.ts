
import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/retry';

import { Storage } from '@ionic/storage';

import { Novel } from './novel';
import { NovelPlatform } from './novelPlatform';
import { Wuxiaco } from './platform/wuxiaco';
import { LNB } from './platform/lnb';

type PlatformMap = {
  id: string,
  platform: NovelPlatform
};

const PLATFORMS: Array<[string, any]> = [
  ['classic', Wuxiaco],
  ['lnb', LNB]
];

@Injectable()
export class PlatformManager {

  private platforms: PlatformMap = <PlatformMap>{};

  constructor(
    public storage: Storage,
    public events: Events,
    public http: Http
  ) {

    for (let elem of PLATFORMS) {
      this.platforms[elem[0]] = new elem[1](this, elem[0]);
    }
  }

  checkPlatform(key: string): boolean {
    return key in this.platforms;
  }

  getPlatform(key: string): NovelPlatform {
    return this.platforms[key];
  }

  default(): NovelPlatform {
    return this.platforms['classic'];
  }

  novelKwargs(opts: any): Novel {
    let plt = this.default();
    if (opts['_platform']) {
      if (this.checkPlatform(opts['_platform'])) {
        plt = this.getPlatform(opts['_platform']);
      } else {
        throw new Error('Bad novel platform');
      }
    }
    return new Novel(plt, opts);
  }

  novel(title: string, id: string, platformId?: string) {
    return this.novelKwargs({ title: title, id: id, _platform: platformId });
  }
}

















