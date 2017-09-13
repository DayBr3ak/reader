
import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { HTTP as CordovaHttp } from '@ionic-native/http';
import { Http as AngularHttp } from '@angular/http';
import 'rxjs/add/operator/retry';

const defaultHeaders = {
  'User-Agent': `Mozilla/5.0 (Linux; Android 7.1.2; trltexx Build/NJH47F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.116 Mobile Safari/537.36`,
  'Accept-Language': 'en-US',
  'Accept-Encoding': 'gzip',
  'Cache-Control': 'no-cache'
}

@Injectable()
export class MyHttpProvider {
  private httpPromise: Promise<CordovaHttp | AngularHttp>;
  private headers = {
    ...defaultHeaders
  };

  setHeader(key: string | any, value?: string) {
    if (typeof key === 'string') {
      if (value === undefined || value === null)
        this.headers[key] = value
      else
        delete this.headers[key]
    } else if (key && typeof key === 'object') {
      this.headers = {
        ...this.headers,
        ...key
      }
    }
  }

  constructor(private plt: Platform, private cordovaHttp: CordovaHttp, private angularHttp: AngularHttp) {
    this.httpPromise = plt.ready()
      .then(() => {
        if (plt.is('cordova')) {
          return cordovaHttp;
        }
        return angularHttp
      })
  }

  async getHtml(url: string): Promise<string> {
    if (this.plt.is('cordova')) {
      const http = <CordovaHttp>(await this.httpPromise);
      console.log(`fetching ${url} through native http plugin`)
      const response = await http.get(url, {}, this.headers);
      if (response.status !== 200) {
        console.error(response);
        throw new Error("status isn't 200");
      }
      if (window['logGetHtml'] === true) {
        console.log(response.data);
        console.log('headers', this.headers);
        console.log('Response_headers', response.headers);
        response.headers
      }
      return response.data;
    } else {
      const http = <AngularHttp>(await this.httpPromise);
      console.log(`fetching ${url} through ANGULAR http module`)

      //TODO set headers?
      const dataPromise = <Promise<string>>new Promise((resolve, reject) => {
        http.get(url)
          // .retry(3)
          .subscribe((response) => {
            if (response.status !== 200) {
              console.error(response.status, response.statusText);
              return reject(new Error("status isn't 200"));
            }
            resolve(response.text());
          }, (error) => {
            reject(error);
          });
      })
      return await dataPromise;
    }
  }


}
