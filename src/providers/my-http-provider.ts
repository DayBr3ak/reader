
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
  private httpGetPromise: Promise<(url: string) => Promise<Response>>;
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

  constructor(plt: Platform, private cordovaHttp: CordovaHttp, private angularHttp: AngularHttp) {
    this.httpGetPromise = plt.ready()
      .then(() => {
        if (plt.is('cordova')) {
          return this.cordovaGet.bind(this);
        }
        return this.angularGet.bind(this);
      })
  }

  private async cordovaGet(url: string) {
    console.log(`fetching ${url} through CORDOVA http plugin`)
    const http = this.cordovaHttp;
    const response = await http.get(url, {}, this.headers);
    if (window['logGetHtml'] === true) {
      console.log(response.data);
      console.log('headers', this.headers);
      console.log('Response_headers', response.headers);
    }
    const responseInit = {
      status: response.status,
      headers: response.headers
    }
    return new Response(response.data, responseInit);
  }

  private angularGet(url: string) {
    console.log(`fetching ${url} through ANGULAR http module`)
    const http = this.angularHttp;
    //TODO set headers?
    return <Promise<Response>>new Promise((resolve, reject) => {
      http.get(url)
        // .retry(3)
        .subscribe((response) => {
          resolve(response);
        }, (error) => {
          reject(error);
        });
    })
  }

  get(url: string): Promise<Response> {
    return this.httpGetPromise.then(r => r(url))
  }

}
