
import { compressToBase64, decompressFromBase64 } from 'lz-string';

import { Novel } from '../novel';

const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

import { NovelPlatform } from '../novelPlatform';
import { PlatformManager } from '../platformManager';

export class Wuxiaco extends NovelPlatform {
  private NAME = 'WUXIACO';
  private URL: string = 'http://m.wuxiaworld.co';

  init() {
    console.log('Hello LNB Platform');
  }

  getGenres(): Array<[number, string]> {
    return [
      [0, 'All'],
      [1, 'Fantasy'],
      [2, 'Xianxia'],
      [3, 'Romantic'],
      [4, 'Historical'],
      [5, 'Sci-fi'],
      [6, 'Game']
    ]
  }

  wordFilter(text: string, pattern: RegExp, replacement: string): string {
    return text.replace(pattern, replacement);
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
      const doc = await this.getDoc(url, (html) => {
        return html.replace(urlRegex, '');
      });
      let articleBody = doc.querySelector('div[itemprop="articleBody"]');
      return getArticleBody(articleBody);
    } catch (error) {
      if (error) console.log(error);
      this.toast('Error loading chapter: ' + chapter + '; error="' + error.status + ':' + error.statusText + '"');
    }
  }

  resolveDirectoryUrl(novelId: string): string {
    return this.resolveChapterUrl(this.id, 'all.html');
  }

  async scrapDirectory(url: string): Promise<any> {
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

    const doc = await this.getDoc(url);
    return parseChapterList(doc);
  }

  resolveChapterUrl(...args: string[]): string {
    return `${this.URL}/${args[0]}/${args[1]}`;
  }

  async scrapChapter(url: string): Promise<any> {
    let parseChapterContent = (doc) => {
      let content = doc.querySelector('#chaptercontent').innerHTML.trim();
      content = this.wordFilter(content, /\*ck/g, 'uck');
      content = content.split('<br><br>');
      return content;
    }
    console.log(url)
    try {
      const doc = await this.getDoc(url);
      return parseChapterContent(doc);
    } catch (error) {
      console.log("scrapChapter Error")
      throw error
    }
  }

  async getNovelList(genre, page=1): Promise<any> {
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
      let doc = await this.getDoc(url);
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
      let doc = await this.getDoc(url);
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

}
