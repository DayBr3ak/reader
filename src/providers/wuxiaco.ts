import { Injectable } from '@angular/core';
import { ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import { Storage } from '@ionic/storage';

// import 'rxjs/add/operator/map';
import 'rxjs/add/operator/retry';
// import { Observable } from 'rxjs/Observable';

import { compressToBase64, decompressFromBase64 } from 'lz-string';

const arrayRange = (n: number, offset:number=0) => {
  return Array.apply(null, Array(n)).map((x, i) => i + offset);
}

const arrayToChunk = (array: Array<any>, n: number) => {
  return Array.from(Array(Math.ceil(array.length / n)), (_,i) => array.slice(i * n, i * n + n));
}

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

  htmlGet(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.get(url)
        .retry(5)
        .subscribe((data) => {
        resolve(data.text());
      }, (error) => {
        reject(error);
      });
    })
  }

  wordFilter(text: string, pattern: RegExp, replacement: string): string {
    return text.replace(pattern, replacement);
  }

  resolveUrl(num: number, id: string) {
    return `http://m.wuxiaworld.co/${id}-index/${id}-chapter-${num}/`;
  }

  wuxiacoUrl(id: string, suffix: string) {
    return `${this.URL}/${id}/${suffix}`
  }

  async scrap(url: string, chapter: number) {
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
        txt = this.wordFilter(txt, /&nbsp;/g, ' ');
        txt = this.wordFilter(txt, htmlTagRegex, '');
        //TODO get rid of the dict
        res.push({ strong: i == 0, text: txt });
      }
      return res;
    }

    try {
      let resHtml = await this.htmlGet(url);
      resHtml = resHtml.replace(urlRegex, '');
      let doc = this.parser.parseFromString(resHtml, 'text/html');
      let articleBody = doc.querySelector('div[itemprop="articleBody"]');
      return getArticleBody(articleBody);
    } catch (error) {
      if (error) console.log(error);
      this.textToast('Error loading chapter: ' + chapter + '; error="' + error.status + ':' + error.statusText + '"');
    }
  }

  async scrapDirectory(url: string) {
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

    const html = await this.htmlGet(url);
    let doc = this.parser.parseFromString(html, 'text/html');
    return parseChapterList(doc);
  }

  async scrapChapter(url: string) {
    let parseChapterContent = (doc) => {
      let content = doc.querySelector('#chaptercontent').innerHTML.trim();
      content = this.wordFilter(content, /\*ck/g, 'uck');
      content = content.split('<br><br>');
      return content;
    }
    console.log(url)
    try {
      const text = await this.htmlGet(url);
      let doc = this.parser.parseFromString(text, 'text/html');
      return parseChapterContent(doc);
    } catch (error) {
      console.log("scrapChapter Error")
      throw error
    }
  }

  async getNovelList(genre, page=1) {
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

    let genreId: number = genre[0];
    let url = `${this.URL}/category/${genreId}/${page}.html`;

    try {
      let html = await this.htmlGet(url);
      let doc = this.parser.parseFromString(html, 'text/html');
      let list = parseNovelList(doc);
      let compressed = compressToBase64(JSON.stringify(list));
      this.storage.set(resolveStName(), compressed);
      return list
    } catch (error) {
      const cachedList = await this.storage.get(resolveStName());
      if (cachedList) {
        console.log('cachehit!')
        let uncompressed = decompressFromBase64(cachedList);
        return JSON.parse(uncompressed);
      } else {
        throw { fn: 'getNovelList', error: `can't access ${url}` }
      }
    }
  }

  async getNovelMeta(novel: Novel, force: boolean=false) {
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

      let lastChapterEle = doc.querySelector('div.synopsisArea_detail>p>a');
      // meta['Last Released'] = parseInt(lastChapterEle.innerText.trim().split(':')[0].substring('Chapter '.length));

      meta['_Title'] = doc.querySelector('span.title').innerText.trim();
      meta['_Desc'] = doc.querySelector('p.review').innerText.trim().substring('Description\n'.length);

      novel.title = meta['_Title'];
      novel.desc = meta['_Desc'];
      return meta;
    }

    try {
      let html = await this.htmlGet(url);
      let doc = this.parser.parseFromString(html, 'text/html');
      let meta = parseNovelMetaData(doc);
      meta['Last Released'] = await novel.getMaxChapter();

      const lastRead = await novel.getCurrentChapter();
      if (lastRead > 1) {
        meta['Last Read'] = lastRead;
      }

      let compressed = compressToBase64(JSON.stringify(meta));
      this.storage.set(resolveStName(), compressed);
      return meta;
    } catch (error) {
      let cachedMeta = await this.storage.get(resolveStName());
      if (cachedMeta) {
        let uncompressed = decompressFromBase64(cachedMeta);
        return JSON.parse(uncompressed);
      }
      else {
        throw { fn: 'getNovelMeta', error: `can't access ${url}` };
      }
    }
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

  private _maxChapter: number;

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
    this._maxChapter = null;
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

  async getDirectory(): Promise<any[]> {
    let url = this.manager.wuxiacoUrl(this.id, 'all.html');

    try {
      const directory = await this.manager.scrapDirectory(url);
      this.setStoredCompressed(ST_NOVEL_DIR, directory);
      return directory;
    } catch (error) {
      const cachedDirectory = await this.getStoredCompressed(ST_NOVEL_DIR);
      if (cachedDirectory) {
        return cachedDirectory;
      }
      throw 'no directory available';
    }
  }

  async scrap(chapter) {
    try {
      const directory = await this.getDirectory();
      if (chapter > directory.length) {
        return { error: "Chapter doesn't " + chapter + " exist yet" };
      }
      const chapterElement = directory[chapter - 1]
      const url = this.manager.wuxiacoUrl(this.id, chapterElement[0]);
      return await this.manager.scrapChapter(url);
    } catch (error) {
      let mes = 'Download error: ' + chapter + ' ' + this.title;
      console.log(mes);
      throw { message: mes, error: error };
    }
  }

  async download() {
    const cacheChapter = async (chapter, url) => {
      const cachedContent = await this.getStored(ST_CHAPTER_TXT + chapter);
      if (cachedContent) {
        console.log('Skip Ch' + chapter + '... Already in cache');
        return;
      }
      const content = await this.manager.scrapChapter(url);
      this.cacheChapterContent(chapter, content);
    }

    try {
      const directory = await this.getDirectory();
      const urls = [];
      for (let i = 0; i < directory.length; i++) {
        const chapterElement = directory[i];
        const url = this.manager.wuxiacoUrl(this.id, chapterElement[0]);
        urls.push([i + 1, url]);
      }
      let count = 0;
      for (let chunk of arrayToChunk(urls, 20)) {
        const promises = chunk.map(tuple => cacheChapter(tuple[0], tuple[1]));
        await Promise.all(promises);
        count += chunk.length;
        console.log(`downloaded ${count} chapters`);
      }
      return directory.length;
    } catch (error) {
      console.log('Error download ' + error);
      return -1
    }
  }

  async removeDownload() {
    const max = await this.getMaxChapter();
    const range = arrayRange(max, 1);

    for (let chunk of arrayToChunk(range, 50)) {
      const promises = chunk.map(chapter => this.manager.storage.remove(this.id + '-' + ST_CHAPTER_TXT + chapter));
      await Promise.all(promises);
      console.log('removed 50 or less chapters');
    }
    console.log('done');
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
    return this.getStored(property).then((data) => {
      if (data) {
        let uncompressed = decompressFromBase64(data);
        return JSON.parse(uncompressed);
      } else {
        return null;
      }
    })
  }

  setStoredCompressed(property: string, val: any): Promise<any> {
    let compressed = compressToBase64(JSON.stringify(val));
    return this.setStored(property, compressed).then(() => {
      return val;
    });
  }

  setScroll(chapter: number, scroll: number): Promise<any> {
    return this.setStored(ST_CHAPTER_SCROLL + chapter, scroll);
  }

  getScroll(chapter: number): Promise<any> {
    return this.getStored(ST_CHAPTER_SCROLL + chapter);
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

  async getMaxChapter() {
    if (this._maxChapter) {
      return this._maxChapter;
    }
    try {
      const directory = await this.getDirectory();
      this._maxChapter = directory.length;
      return this._maxChapter;
    } catch (error) {
      this._maxChapter = null;
      return 20000;
    }
  }

  async getCurrentChapter() {
    const chapter = await this.getStored(ST_CURRENT_CHAPTER);
    if (chapter)
      return chapter
    return 1
  }
}

