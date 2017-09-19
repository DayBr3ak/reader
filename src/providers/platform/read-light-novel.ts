import { NovelPlatform } from '../novelPlatform';
import { PlatformManager } from '../platformManager';
import { Novel } from '../novel';


export class ReadLightNovel extends NovelPlatform {
  URL: string = 'https://www.readlightnovel.org/';

  init() {
    console.log('Hello ReadLightNovel Platform');
  }

  resolveDirectoryUrl(id: string) {
    return this.URL + id;
  }

  async getChapterUrl(chapter: number, novelId: string, directory: Array<any>): Promise<any> {
    return directory[chapter - 1];
  }

  getGenres(): Array<[number, string]> {
    return [
      [0, 'All'],
    ]
  }

  async getNovelList(genre, page?:number): Promise<any> {

    const getId = (href: string) => {
      let split = href.split('/');
      if (split.length !== 4) {
        throw 'Cant get id from href';
      }
      return split[3];
    }

    const doc = await this.getDoc(this.URL + 'novel-list');
    const lis = doc.querySelectorAll('.list-by-word-body>ul>li');
    const results = [];
    for (let i = 0; i < lis.length; i++) {
      const li = lis[i];

      const a = li.querySelector('a');
      results.push({
        title: a.innerHTML.trim(),
        href: a.getAttribute('href'),
        id: getId(a.getAttribute('href')),
        author: '...',
        desc: li.querySelector('.pop-summary>p').innerText.trim(),
        _platform: this.id
      })
    }
    return { max: 1, currentPage: 1, list: results}
  }

  async getNovelMeta(novel: Novel, force?: boolean): Promise<any> {
    const doc = await this.getDoc(this.resolveDirectoryUrl(novel.id));
    const details = doc.querySelector('.novel-details').querySelectorAll('.novel-detail-item');

    const body = (d => d.querySelector('.novel-detail-body').innerText.trim())
    const meta = {
      _Author: body(details[4]),
      Status: body(details[7]),
      Year: body(details[6]),
    }
    return meta;
  }

  async scrapDirectory(url: string): Promise<any> {
    const doc = await this.getDoc(url);
    return Array.prototype.map.call(
      doc.querySelectorAll('.chapter-chs>li>a'),
      a => a.getAttribute('href')
    )
  }

  async scrapChapter(url: string): Promise<any> {
    const doc = await this.getDoc(url);

    const content = doc.querySelector('.chapter-content3');
    content.removeChild(content.querySelector('noscript'));
    content.removeChild(content.querySelector('div'));

    return content.innerText.trim().split('\n').filter(t => t.length > 0);
  }

}









