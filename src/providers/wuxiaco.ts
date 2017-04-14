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
  private name = 'WUXIACO';
  private parser: DOMParser = new DOMParser();
  private URL: string = 'http://m.wuxiaworld.co';
  public GENRE = [
    [0, 'All'],
    [1, 'Fantasy'],
    [2, 'Xianxia'],
    [3, 'Romantic'],
    [4, 'Historical'],
    [5, 'Sci-fi'],
    [6, 'Game']
  ]

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
    return `${this.URL}/${novelId}/${suffix}`
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

  getNovelList(genre, page=1, force=false): Promise<any> {
    let parseAuthor = (div): string => {
      let author = div.querySelector('p.author').innerText.trim();
      author = author.split('Author：')[1];
      return author;
    }
    let parseDesc = (div): string => {
      let desc = div.querySelector('p.review').innerText.trim();
      const x = 'Introduce:Description '.length;
      return desc.substring(x);
    }
    let parseNovelId = (href: string): string => {
      return href.replace(new RegExp('/', 'g'), '')
    }

    let parseNovelList = doc => {
      let divList = doc.querySelectorAll('div.hot_sale');
      let result = [];
      for (let i = 0; i < divList.length; i++) {
        let div = divList[i];
        let item = {
          href: div.querySelector('a').getAttribute('href'),
          title: div.querySelector('p.title').innerText.trim(),
          author: parseAuthor(div),
          desc: parseDesc(div)
        };
        item['novelObject'] = { name: item.title, id: parseNovelId(item.href) };
        result.push(item);
      }
      let nbPages = doc.querySelector('input[name=txtPage]').getAttribute('value').split('/')[1];
      return { max: parseInt(nbPages), currentPage: page, list: result };
    };

    let resolveStName = () => {
      return `${this.name}-${genre[0]}-${page}`;
    }

    let request = (resolve, reject) => {
      let genreId: number = genre[0];
      let url = `${this.URL}/category/${genreId}/${page}.html`;
      this.http.get(url).subscribe((data) => {
        let doc = this.parser.parseFromString(data.text(), 'text/html');
        let list = parseNovelList(doc);
        this.storage.set(resolveStName(), list);
        resolve(list);
      }, error => {
        reject(error);
      })
    }

    return new Promise((resolve, reject) => {
      if (force) {
        return request(resolve, reject);
      }
      this.storage.get(resolveStName()).then((v) => {
        if (v) {
          console.log('cachehit!')
          resolve(v);
        }
        else {
          return request(resolve, reject);
        }
      })
    }) // promise
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
        if (chapter > directory.length) {
          return new Promise(resolve => {
            resolve({ error: "Chapter doesn't " + chapter + " exist yet" });
          })
        }
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
        let count = 0;
        let complete = () => {
          count++;
          if (count == 5)
            resolve();
        }

        let asyncDl = (i, step) => {
          if (i >= directory.length) {
            return complete();
          }
          console.log('download chapter ' + i);
          this.getStored(ST_CHAPTER_TXT + i).then(v => {
            if (v) {
              // pass
              return asyncDl(i + step, step);
            }
            let chapterElement = directory[i - 1]
            let url = this.manager.wuxiacoUrl(this.novelId, chapterElement[0]);
            this.manager.scrapChapter(url, i).then(content => {
              this.cacheChapterContent(i, content);
              asyncDl(i + step, step);
            })
          })
        }

        asyncDl(1, 5);
        asyncDl(2, 5);
        asyncDl(3, 5);
        asyncDl(4, 5);
        asyncDl(5, 5);
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

