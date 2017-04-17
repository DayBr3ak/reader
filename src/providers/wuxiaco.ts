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
  private NAME = 'WUXIACO';
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

  wordFilter(text: string, pattern: RegExp, replacement: string): string {
    return text.replace(pattern, replacement);
  }

  resolveUrl(num: number, id: string) {
    return `http://m.wuxiaworld.com/${id}-index/${id}-chapter-${num}/`;
  }

  wuxiacoUrl(id: string, suffix: string) {
    return `${this.URL}/${id}/${suffix}`
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

        let txt = para[i].innerHTML;
        txt = this.wordFilter(txt, /&nbsp;/, ' ');
        txt = this.wordFilter(txt, htmlTagRegex, '');
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

  scrapChapter(url: string): Promise<any> {
    let parseChapterContent = (doc) => {
      let content = doc.querySelector('#chaptercontent').innerHTML.trim();
      content = this.wordFilter(content, /\*ck/, 'uck');
      content = content.split('<br><br>');
      return content;
    }

    console.log(url)
    return new Promise((resolve, reject) => {
      this.http.get(url).subscribe((data) => {
        let doc = this.parser.parseFromString(data.text(), 'text/html');
        let content = parseChapterContent(doc);
        resolve(content);
      }, (error) => {
        console.log("scrapChapter Error")
        reject(error);
      })
    })
  }

  getNovelList(genre, page=1): Promise<any> {
    let parseAuthor = (div): string => {
      let author = div.querySelector('p.author').innerText.trim();
      author = author.split('Author：')[1].trim();
      return author;
    }
    let parseDesc = (div): string => {
      let desc = div.querySelector('p.review').innerText.trim();
      const x = 'Introduce:Description '.length;
      return desc.substring(x).trim();
    }
    let parseNovelId = (div): string => {
      let href = div.querySelector('a').getAttribute('href');
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
          desc: parseDesc(div),
          id: parseNovelId(div)
        };
        result.push(item);
      }
      let nbPages = doc.querySelector('input[name=txtPage]').getAttribute('value').split('/')[1];
      return { max: parseInt(nbPages), currentPage: page, list: result };
    };

    let resolveStName = () => {
      return `${this.NAME}-${genre[0]}-${page}`;
    }

    let request = () => {
      return new Promise((resolve, reject) => {
        let genreId: number = genre[0];
        let url = `${this.URL}/category/${genreId}/${page}.html`;
        this.http.get(url).subscribe((data) => {
          let doc = this.parser.parseFromString(data.text(), 'text/html');
          let list = parseNovelList(doc);
          let compressed = compressToBase64(JSON.stringify(list));
          this.storage.set(resolveStName(), compressed);
          resolve(list);
        }, error => {
          reject({ url: url, error: error });
        })
      })
    }

    return new Promise((resolve, reject) => {
      request().then((list) => {
        resolve(list);
      })
      .catch((error) => {
        this.storage.get(resolveStName()).then((v) => {
          if (v) {
            console.log('cachehit!')
            let uncompressed = decompressFromBase64(v);
            resolve(JSON.parse(uncompressed));
          }
          else {
            reject({ fn: 'getNovelList', error: `can't access ${error.url}` })
          }
        })
      })
    })
  }

  getNovelMeta(novel: Novel, force: boolean=false) {
    let resolveStName = () => {
      return `${this.NAME}-meta-${novel.id}`;
    }
    let url = `${this.URL}/${novel.href()}`;

    let parseNovelMetaData = (doc) => {
      let meta = {};
      let categoryEle = doc.querySelector('p.sort');
      meta['Category'] = categoryEle.innerText.trim().substring('Category:'.length).trim();
      meta['Status'] = categoryEle.nextElementSibling
        .innerText.trim().substring('Status:'.length).trim();
      let updateTime = categoryEle.nextElementSibling.nextElementSibling
        .innerText.trim().substring('UpdateTime:'.length).trim();
      let p = new Date(Date.parse(updateTime));
      meta['Updated'] = p.toISOString().split('T')[0];

      let lastChapterEle= doc.querySelector('div.synopsisArea_detail>p>a');
      meta['Last Released'] = parseInt(lastChapterEle.innerText.trim().split(':')[0].substring('Chapter '.length));

      meta['_Title'] = doc.querySelector('span.title').innerText.trim();
      meta['_Desc'] = doc.querySelector('p.review').innerText.trim().substring('Description\n'.length);

      novel.title = meta['_Title'];
      novel.desc = meta['_Desc'];
      return meta;
    }

    let request = () => {
      return new Promise((resolve, reject) => {
        this.http.get(url).subscribe((data) => {
          let doc = this.parser.parseFromString(data.text(), 'text/html');
          let meta = parseNovelMetaData(doc);
          let compressed = compressToBase64(JSON.stringify(meta));
          this.storage.set(resolveStName(), compressed);
          resolve(meta);
        }, error => {
          reject(error);
        })
      })
    }

    return new Promise((resolve, reject) => {
      // if (force) {
        // return request(resolve, reject);
      // }
      request().then((meta) => {
        resolve(meta);
      })
      .catch((error) => {
        this.storage.get(resolveStName()).then((v) => {
          if (v) {
            let uncompressed = decompressFromBase64(v);
            resolve(JSON.parse(uncompressed));
          }
          else {
            reject({ fn: 'getNovelMeta', error: `can't access ${url}` });
          }
        })
      })
    }) // promise
  }

  novelKwargs(opts: any): Novel {
    return new Novel(this, opts);
  }

  novel(title: string, id: string) {
    return this.novelKwargs({ title: title, id: id });
  }

}

export class Novel {
  public manager: Wuxiaco;
  public id: string;
  public title: string;
  public author: string;
  public desc: string;

  constructor(
    manager: Wuxiaco,
    opts: any
  ) {
    this.manager = manager;
    if (!opts.id || !opts.title) {
      opts.error = 'need title and id'
      console.error(opts)
      throw opts
    }
    this.id = opts.id;
    this.title = opts.title;
    this.author = opts.author || 'Unknown';
    this.desc = opts.desc || 'None';
  }

  meta() {
    return {
      title: this.title,
      id: this.id,
      author: this.author,
      desc: this.desc
    };
  }

  href(): string {
    return `/${this.id}/`;
  }

  resolveUrl(chapter) {
    return this.manager.resolveUrl(chapter, this.id);
  }

  getDirectory(): Promise<any> {
    let url = this.manager.wuxiacoUrl(this.id, 'all.html');
    return this.manager.scrapDirectory(url).then((directory) => {
      return this.setStoredCompressed(ST_NOVEL_DIR, directory);
    })
    .catch((error) => {
      return this.getStoredCompressed(ST_NOVEL_DIR).then((directory) => {
        return new Promise((resolve, reject) => {
          if (directory) {
            resolve(directory);
          } else {
            reject('no directory')
          }
        })
      })
    })
  }

  scrap(chapter): Promise<any> {
    // let url = this.resolveUrl(chapter);
    return this.getDirectory()
    .then((directory) => {
      if (chapter > directory.length) {
        return new Promise(resolve => {
          resolve({ error: "Chapter doesn't " + chapter + " exist yet" });
        })
      }
      let chapterElement = directory[chapter - 1]
      let url = this.manager.wuxiacoUrl(this.id, chapterElement[0]);
      return this.manager.scrapChapter(url);
    }).catch((error) => {
      let mes = 'Download error: ' + chapter + ' ' + this.title;
      console.log(mes);
      return Promise.reject({ message: mes, error: error });
    })
  }


  download(): Promise<any> {
    return this.getDirectory().then((directory: any[]) => {
      let createSequence = (start: number, step: number): Promise<any> => {
        let sequence = Promise.resolve();
        for (let i = start; i < directory.length; i = i + step) {
          const chapter = i + 1;
          sequence = sequence.then(() => {
            console.log('download chapter ' + chapter);
            return this.getStored(ST_CHAPTER_TXT + chapter).then((v) => {
              if (v) {
                return Promise.resolve(v);
              }
              const chapterElement = directory[i];
              const url = this.manager.wuxiacoUrl(this.id, chapterElement[0]);
              return this.manager.scrapChapter(url).then(content => {
                return this.cacheChapterContent(chapter, content);
              });
            });
          });
        } // for
        return sequence
      }

      const step = 5
      const list = [];
      for (let i = 0; i < step; i++) {
        list.push(createSequence(i, 5));
      }

      return Promise.all(list).then(() => {
        return Promise.resolve(directory.length);
      })
    })
    .catch((error) => {
      console.log('Error download ' + error);
      return Promise.resolve(-1);
    })
  }

  removeDownload(): Promise<any> {
    return new Promise(resolve => {
      this.getMaxChapter().then(max => {

        let prList = [];
        for (let i = 0; i < max; i++) {
          let chapter = i + 1;
          let pr = this.manager.storage.remove(this.id + '-' + ST_CHAPTER_TXT + chapter);
          prList.push(pr);
        }
        Promise.all(prList).then(() => {
          resolve();
        })
      });
    });
  }

  getMoreMeta(force: boolean=false): Promise<any> {
    return this.manager.getNovelMeta(this, force);
  }

  getStored(property: string, prefix: string = this.id): Promise<any> {
    return this.manager.storage.get(prefix + '-' + property);
  }

  setStored(property: string, val: any, prefix: string = this.id): Promise<any> {
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

  setScroll(chapter: number, scroll: number): Promise<any> {
    return this.setStored(ST_CHAPTER_SCROLL + chapter, scroll);
  }

  getScroll(chapter: number): Promise<any> {
    return this.getStored(ST_CHAPTER_SCROLL + chapter);
  }

  getCurrentChapter(): Promise<any> {
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

  setCurrentChapter(chapter: number): Promise<any> {
    return this.setStored(ST_CURRENT_CHAPTER, chapter);
  }

  cacheChapterContent(chapter: number, content: string): Promise<any> {
    return this.setStoredCompressed(ST_CHAPTER_TXT + chapter, content);
  }

  getChapterContent(chapter: number): Promise<any> {
    return this.getStoredCompressed(ST_CHAPTER_TXT + chapter);
  }

  getMaxChapter(): Promise<any> {
    return new Promise(resolve => {
      this.getDirectory().then((directory) => {
        resolve(directory.length);
      }).catch((error) => {
        resolve(20000)
      });
    })
  }
}

