
import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { HTTP as CordovaHttp } from '@ionic-native/http';
import { Http as AngularHttp } from '@angular/http';
import { Observable } from 'rxjs';
// import 'rxjs/add/operator/retry';

const defaultHeaders = {
  'User-Agent': `Mozilla/5.0 (Linux; Android 7.1.2; trltexx Build/NJH47F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.116 Mobile Safari/537.36`,
  'Accept-Language': 'en-US',
  'Accept-Encoding': 'gzip',
  'Cache-Control': 'no-cache'
}

@Injectable()
export class MyHttpProvider {
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

  constructor(
    private plt: Platform,
    private cordovaHttp: CordovaHttp,
    private angularHttp: AngularHttp)
  {}

  private cordovaGet(url: string) {
    return Observable.fromPromise(this.cordovaHttp.get(url, {}, this.headers))
      .do(() => {
        console.log(`fetching ${url} through CORDOVA http plugin`)
      })
      .flatMap(response => {
        if (window['logGetHtml'] === true) {
          console.log(response.data);
          console.log('headers', this.headers);
          console.log('Response_headers', response.headers);
        }
        const responseInit = {
          status: response.status,
          headers: response.headers
        }
        return Observable.of(new Response(response.data, responseInit));
      })
  }

  private angularGet(url: string) {
    return this.angularHttp.get(url).do(() => {
      console.log(`fetching ${url} through ANGULAR http module`)
    })
  }

  get(url: string) {
     return Observable.fromPromise(this.plt.ready())
       .flatMap<string, Response>(() => {
         if (this.plt.is('cordova')) {
           return this.cordovaGet(url);
         }
         return this.angularGet(url);
       })
  }

}
