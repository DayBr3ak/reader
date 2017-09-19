

import { NovelPlatform } from '../novelPlatform';
import { PlatformManager } from '../platformManager';
import { Novel } from '../novel';

export class Kokuma extends NovelPlatform {
  NOVEL_U = 'http://www.novelupdates.com/series/arena/';

  init() {
    console.log('Hello Kokuma Platform');
  }

  getGenres(): Array<[number, string]> {
    return [
      [0, 'All']
    ]
  }

  async getNovelList(genre, page?:number): Promise<any> {
    const doc = await this.getDoc(this.NOVEL_U);
    const list = [
      {
        href: this.NOVEL_U,
        title: "Arena",
        author: 'Nicolo',
        desc: doc.querySelector('div#editdescription>p').innerText,
        id: 'arena',
        _platform: this.id
      }
    ];
    return { max: 1, currentPage: 1, list: list}
  }

  resolveDirectoryUrl(id: string): string {
    return this.NOVEL_U;
  }

  async scrapDirectory(url: string): Promise<any> {
    const doc = await this.getDoc(this.NOVEL_U);

    // get nb page
    let maxPage: any = doc.querySelectorAll('.digg_pagination')[0].children;
    maxPage = parseInt(maxPage[maxPage.length - 2].innerText);

    const directory = [];
    // get chapters
    const parseChapList = (doc) => {
      let rows = doc.querySelectorAll('#myTable>tbody>tr');
      const res = [];
      for (let i = 0; i < rows.length; i++) {
        let cells = rows[i].children;
        let el = cells[cells.length - 1].children[1];
        res.push(el.getAttribute('href'));
      }
      return res;
    }

    directory.push(...parseChapList(doc));

    const urls = [];
    for (let i = 2; i <= maxPage; i++) {
      urls.push(this.NOVEL_U + '?pg=' + i);
    }
    const docPromises = urls.map((u) => this.getDoc(u));
    const docs = await Promise.all(docPromises);

    for (let d of docs) {
      directory.push(...parseChapList(d));
    }

    return directory.reverse();
  }

  async scrapChapter(url: string): Promise<any> {
    const doc = await this.getDoc(url);

    let paragraphs = doc.querySelectorAll('.entry-content')[0].children;
    const res = [];

    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].tagName === 'P') {
        res.push(paragraphs[i].innerHTML);
      }
    }
    const last = res.pop();
    if (last.search('Previous Chapter') <= -1 && last.search('Next Chapter') <= -1) {
      res.push(last);
    }

    return res;
  }

  async getNovelMeta(novel: Novel, force?: boolean): Promise<any> {
    // throw new Error('need implem!!');
    // const maxChapterPromise = novel.getMaxChapter();
    // const doc = await this.getDoc(this.resolveDirectoryUrl(novel.id));
    // const meta = {
    //   _Author: doc.querySelectorAll('header>h2')[0].innerText,
    //   Status: doc.querySelectorAll('header>h3>span')[0].innerText,
    //   _Desc: doc.querySelectorAll('header>p')[1].innerText
    // };
    // novel.desc = meta._Desc;
    // novel.author = meta._Author;
    const meta = {
      Status: 'Active'
    }
    // meta['Last Released'] = await maxChapterPromise;
    return meta;
  }

  async getChapterUrl(chapter: number, novelId: string, directory: Array<any>): Promise<any> {
    return directory[chapter - 1];
  }
}
















