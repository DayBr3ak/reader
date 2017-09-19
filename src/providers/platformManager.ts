
import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';

import { Storage } from '@ionic/storage';

import { Novel } from './novel';
import { NovelPlatform } from './novelPlatform';
import { Wuxiaco } from './platform/wuxiaco';
import { LNB } from './platform/lnb';
import { Kokuma } from './platform/kokuma';
import { ReadLightNovel } from './platform/read-light-novel';

import { MyHttpProvider } from './my-http-provider';

type PlatformMap = {
  id: string,
  platform: NovelPlatform
};

export const PLATFORMS: Array<[string, any, string]> = [
  ['readlightnovel', ReadLightNovel, 'Read-Light-Novel'],
  ['classic', Wuxiaco, 'Classic'],
  ['lnb', LNB, 'LightNovelBastion'],
  ['kokuma', Kokuma, 'Kokuma'],
];

@Injectable()
export class PlatformManager {

  private platforms: PlatformMap = <PlatformMap>{};

  constructor(
    public storage: Storage,
    public events: Events,
    public http: MyHttpProvider
  ) {

    for (let elem of PLATFORMS) {
      this.platforms[elem[0]] = new elem[1](this, elem[0]);
    }
  }

  fetchHtml(url: string): Promise<string> {
    return new Promise((r, reject) => {
      this.http.get(url)
        .map(response => {
          if (response.status !== 200) {
            console.error(response.status, response.statusText);
            throw new Error("status isn't 200");
          }
          return response.text();
        })
        .retry(3)
        .subscribe(r, reject)
    });
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

















