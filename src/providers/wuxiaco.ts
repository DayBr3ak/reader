import { Injectable } from '@angular/core';
import { ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import { Storage } from '@ionic/storage';

import 'rxjs/add/operator/map';
// import { Observable } from 'rxjs/Observable';

import { compressToBase64, decompressFromBase64 } from 'lz-string';


const ST_CURRENT_CHAPTER = 'current-chapter';
const ST_CHAPTER_TXT = 'chapter-txt-';
const ST_CHAPTER_SCROLL = 'chapter-scroll-';
const ST_NOVEL_DIR = 'novel-directory';
const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

@Injectable()
export class Wuxiaco {
  private parser: DOMParser = new DOMParser();

  constructor(
    public http: Http,
    public toastCtrl: ToastController,
    public storage: Storage
  ) {
    console.log('Hello Wuxiaco Provider');
  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  resolveUrl(num: number, novelId: string) {
    return `http://m.wuxiaworld.com/${novelId}-index/${novelId}-chapter-${num}/`;
  }

  wuxiacoUrl(novelId: string, suffix: string) {
    return `http://m.wuxiaworld.co/${novelId}/${suffix}`
  }

  scrap(url: string, chapter: number, callback) {
    let getArticleBody = (articleBody) => {
      let len = articleBody.children.length;
      let elemToDel = [
        articleBody.children[len - 1],
        articleBody.children[len - 2],
        articleBody.children[1],
        articleBody.children[0]
      ];
      for (let i = 0; i < elemToDel.length; i++) {
        articleBody.removeChild(elemToDel[i]);
      }

      let para = articleBody.getElementsByTagName('p');
      let res = [];
      for (let i = 0; i < para.length; i++) {
        const htmlTagRegex = /(<([^>]+)>)/ig

        let txt = para[i].innerHTML.replace('&nbsp;', ' ');
        txt = txt.replace(htmlTagRegex, '');
        //TODO get rid of the dict
        res.push({ strong: i == 0, text: txt });
      }
      return res;
    }

    return this.http.get(url).subscribe((data) => {
      let resHtml = data.text();
      resHtml = resHtml.replace(urlRegex, '');

      let doc = this.parser.parseFromString(resHtml, 'text/html');
      let articleBody = doc.querySelector('div[itemprop="articleBody"]');
      callback(getArticleBody(articleBody));
    }, (error) => {
      if (error) console.log(error);
      this.textToast('Error loading chapter: ' + chapter + '; error="' + error.status + ':' + error.statusText + '"');
    }, () => {
      // complete
    })
  }

  scrapDirectory(url: string) {
    let parseChapterList = (doc) => {
      let links = doc.querySelectorAll('#chapterlist>p>a');
      var filter = Array.prototype.filter;
      links = filter.call(links, node => node.getAttribute('href') != '#bottom');

      let directory = [];
      for (let i = 0; i < links.length; i++) {
        let link = links[i];
        directory.push([link.getAttribute('href'), link.innerText]);
      }

      return directory;
    };

    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe((data) => {
        let doc = this.parser.parseFromString(data.text(), 'text/html');
        let directory = parseChapterList(doc);
        resolve(directory);
      }, (error) => {
        reject(error);
      });
    });
  }

  scrapChapter(url: string, chapter: number): Promise<any> {
    let parseChapterContent = (doc) => {
      let content = doc.querySelector('#chaptercontent').innerHTML.trim();
      content = content.split('<br><br>');
      return content;
    }

    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe((data) => {
        let doc = this.parser.parseFromString(data.text(), 'text/html');
        let content = parseChapterContent(doc);
        resolve(content);
      }, (error) => {
        reject(error);
      })
    })
  }

  novel(opts: any): Novel {
    let name: string = opts.name;
    let id: string = opts.id;
    if (opts.name && opts.id) {
      return new Novel(this, name, id);
    }
  }
}

export class Novel {
  public manager: Wuxiaco;
  public novelId: string;
  public name: string;
  public directoryObservable: any;

  constructor(
    manager: Wuxiaco,
    name: string,
    novelId: string
  ) {
    this.manager = manager;
    this.novelId = novelId;
    this.name = name;
  }

  meta() {
    return {name: this.name, id: this.novelId};
  }

  resolveUrl(chapter) {
    return this.manager.resolveUrl(chapter, this.novelId);
  }

  getDirectory(): Promise<any> {
    let url = this.manager.wuxiacoUrl(this.novelId, 'all.html');

    return this.manager.scrapDirectory(url).then((directory) => {
      return this.setStoredCompressed(ST_NOVEL_DIR, directory);
    }, (error) => {
      console.log(error);
      return this.getStoredCompressed(ST_NOVEL_DIR);
    })
  }

  scrap(chapter): Promise<any> {
    // let url = this.resolveUrl(chapter);
    return this.getDirectory()
    .then((directory) => {
      if (directory) {
        let chapterElement = directory[chapter - 1]
        let url = this.manager.wuxiacoUrl(this.novelId, chapterElement[0]);
        return this.manager.scrapChapter(url, chapter);
      }
      throw "offline or can't reach directory";
    })
  }

  download(): Promise<any> {
    return new Promise(resolve => {
      this.getDirectory().then(directory => {
        let complete = () => {
          resolve();
        }

        let asyncDl = (i) => {
          if (i == directory.length) {
            return complete();
          }
          console.log('download chapter ' + i);
          this.getStored(ST_CHAPTER_TXT + i).then(v => {
            if (v) {
              // pass
              return asyncDl(i + 1);
            }
            let chapterElement = directory[i - 1]
            let url = this.manager.wuxiacoUrl(this.novelId, chapterElement[0]);
            this.manager.scrapChapter(url, i).then(content => {
              this.cacheChapterContent(i, content);
              asyncDl(i + 1);
            })
          })
        }

        asyncDl(1);
      })
    })
  }

  getStored(property: string, prefix: string = this.novelId): Promise<any> {
    return this.manager.storage.get(prefix + '-' + property);
  }

  setStored(property: string, val: any, prefix: string = this.novelId): Promise<any> {
    return this.manager.storage.set(prefix + '-' + property, val);
  }

  getStoredCompressed(property: string): Promise<any> {
    return new Promise(resolve => {
      this.getStored(property).then((data) => {
        if (data) {
          let uncompressed = decompressFromBase64(data);
          resolve(JSON.parse(uncompressed));
        } else {
          resolve(null);
        }
      })
    });
  }

  setStoredCompressed(property: string, val: any): Promise<any> {
    return new Promise(resolve => {
      let compressed = compressToBase64(JSON.stringify(val));
      this.setStored(property, compressed).then(() => {
        resolve(val);
      })
    })
  }

  setScroll(chapter: number, scroll: number): Promise<void> {
    return this.setStored(ST_CHAPTER_SCROLL + chapter, scroll);
  }

  getScroll(chapter: number): Promise<number> {
    return this.getStored(ST_CHAPTER_SCROLL + chapter);
  }

  getCurrentChapter(): Promise<number> {
    return new Promise(resolve => {
      this.getStored(ST_CURRENT_CHAPTER).then((v) => {
        if (v) {
          resolve(v);
        } else {
          resolve(1);
        }
      })
    })
  }

  setCurrentChapter(chapter: number): Promise<void> {
    return this.setStored(ST_CURRENT_CHAPTER, chapter);
  }

  cacheChapterContent(chapter: number, content: string): Promise<void> {
    return this.setStoredCompressed(ST_CHAPTER_TXT + chapter, content);
  }

  getChapterContent(chapter: number): Promise<string> {
    return this.getStoredCompressed(ST_CHAPTER_TXT + chapter);
  }

  getMaxChapter(): Promise<number> {
    return new Promise(resolve => {
      this.getDirectory().then((directory) => {
        resolve(directory.length);
      });
    })
  }
}

