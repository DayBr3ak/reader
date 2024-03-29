
import { NovelPlatform } from '../novelPlatform';
import { PlatformManager } from '../platformManager';
import { Novel } from '../novel';


export class LNB extends NovelPlatform {
  URL: string = 'https://lightnovelbastion.com';

  init() {
    console.log('Hello LNB Platform');
  }

  getGenres(): Array<[number, string]> {
    return [
      [0, 'All'],
      [1, 'Korean'],
      [2, 'Japanese'],
      [3, 'Inactive']
    ]
  }

  async getNovelList(genre, page?:number): Promise<any> {

    const getId = (url) => {
      let r = /\?p=([0-9]+)/
      let res = r.exec(url);
      if (res && res[1]) {
        return res[1];
      }
      throw 'Cant get id from url';
    }

    const doc = await this.getDoc(this.URL);
    let drop = doc.querySelectorAll('.dropdown')[1];
    let flyouts = drop.querySelectorAll('li.flyout');

    const all = [];
    const parseOne = (idx) => {
      let results = [];
      for(let li of flyouts[idx].querySelectorAll('li')) {
        let a = li.querySelector('a');
        let href = a.getAttribute('href');
        let text = a.innerText;

        let item = {
          href: href,
          title: text,
          author: 'NC',
          desc: 'NC',
          id: getId(href),
          _platform: this.id
        }
        results.push(item);
        all.push(item);
      }
      return results;
    }

    const koreans = parseOne(0);
    const jap = parseOne(1);
    const inactiv = parseOne(2);

    const choose = () => {
      switch (genre[0]) {
        case 0:
          return all;
        case 1:
          return koreans;
        case 2:
          return jap;
        case 3:
          return inactiv;
        default:
          throw 'wrong genre entered';
      }
    }

    return { max: 1, currentPage: 1, list: choose()}
  }

  resolveDirectoryUrl(id: string): string {
    return 'https://lightnovelbastion.com/project.php?p=' + id;
  }

  resolveChapterUrl(...args: string[]): string {
    return 'https://lightnovelbastion.com/release.php?p=' + args[0];
  }

  async scrapDirectory(url: string): Promise<any> {
    const doc = await this.getDoc(url);
    const links = doc.querySelectorAll('ul.reading-list>li>a');

    const directory = [];
    for (let i = 0; i < links.length; i++) {
      directory.push(links[i].getAttribute('href'));
    }
    return directory.reverse();
  }

  filterParagraphContent(p) {
    const r = /<span style="color:.*">.*it\ has\ been\ stolen!\)<\/span>/gi;
    return p.replace(r, '');
  }

  async scrapChapter(url: string): Promise<any> {
    const doc = await this.getDoc(url);

    let paragraphs = doc.querySelectorAll('section.box.style1.blacktext')[0].children;
    const title = doc.querySelectorAll('header#releases>h2');

    const result = [];
    if (title.length > 0) {
      result.push(title[0].innerHTML);
    }

    for (let i = 0; i < paragraphs.length; i++) {
      const e = paragraphs[i];
      if (e.tagName === 'P' || e.tagName === 'DIV') {
        result.push(this.filterParagraphContent(e.innerHTML));
      }
    }
    return result;
  }

  async getNovelMeta(novel: Novel, force?: boolean): Promise<any> {
    // throw new Error('need implem!!');
    // const maxChapterPromise = novel.getMaxChapter();
    const doc = await this.getDoc(this.resolveDirectoryUrl(novel.id));
    let desc = doc.querySelectorAll('header>p')[1].innerText;
    if (!desc || desc.length <= 0) {
      desc = doc.querySelectorAll('header>blockquote>p')[0].innerText;
    }
    const meta = {
      _Author: doc.querySelectorAll('header>h2')[0].innerText,
      Status: doc.querySelectorAll('header>h3>span')[0].innerText,
      _Desc: desc
    };
    // meta['Last Released'] = await maxChapterPromise;

    return meta;
  }

  async getChapterUrl(chapter: number, novelId: string, directory: Array<any>): Promise<any> {
    return directory[chapter - 1];
  }
}
















