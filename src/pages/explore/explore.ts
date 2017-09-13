import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Events,
  Content, Platform, PopoverController, ToastController,
} from 'ionic-angular';
// import { Wuxiaco } from '../../providers/wuxiaco';
import { NovelPlatform } from '../../providers/novelPlatform';
import { PlatformManager, PLATFORMS } from '../../providers/platformManager';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/concat';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/switchMap';

const arrayRange = (n: number, offset:number=0) => {
  if (n <= 1) {
    return [];
  }
  return Array.apply(null, Array(n)).map((x, i) => i + offset);
}

const arrayToChunk = (array: Array<any>, n: number) => {
  return Array.from(Array(Math.ceil(array.length / n)), (_,i) => array.slice(i * n, i * n + n));
}

const platformsToSelector = () => {
  const result = [];
  for (let elem of PLATFORMS) {
    result.push([elem[0], elem[2]]);
  }
  return result;
}

@IonicPage()
@Component({
  selector: 'page-explore',
  templateUrl: 'explore.html',
})
export class ExplorePage {
  @ViewChild('content') content: Content;

  isLoading: boolean = false;
  novelListDefault: any;
  novelSearch: any;

  novelPlatforms: any;
  novelPlatform: any;

  genres: any;
  genreFilter: any;

  _list = new BehaviorSubject([{ title: 'Winter', desc: 'Is at your doorstep'}])
  get list() {
    return this._list.asObservable();
  }
  searchInputSubject = new Subject();

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private events: Events,
    private plt: Platform,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,

    private ga: GoogleAnalytics,
    private novelService: PlatformManager
  ) {

    this.novelListDefault = [];

    this.novelPlatforms = platformsToSelector();
    this.updatePlatformSelection(this.novelPlatforms[0][0]);
    this.ga.trackView("Explore Page");

    this.searchInputSubject.asObservable()
      .debounceTime(500)
      .map((event: any) => event.target.value)
      .map((value: string) => value? value.trim() : '')
      .distinctUntilChanged()
      .subscribe(v => {
        this._getItems(v)
      })
      // .switchMap(search => this.apiService.getItems(searchText);
  }

  updatePlatformSelection(pltId: string) {
    this.novelPlatform = pltId;
    this.genres = this.getNovelPlatform().getGenres();
    this.genreFilter = this.genres[0][0];
  }

  getNovelPlatform(): NovelPlatform {
    return this.novelService.getPlatform(this.novelPlatform);
  }

  textToast(text: string, time: number = 2000) {
    this.events.publish('toast', text, time);
  }

  ionViewDidLoad() {
    window['thiz'] = this;
    console.log('ionViewDidLoad ExplorePage');

    this.loadListAll().then(() => {
      console.log('loadListAll over')
    });
  }

  async loadListAll() {
    this.isLoading = true;
    this.novelListDefault = [];

    try {
      const page1Promise = this.loadList(1);
      // need the first chapter to know how many page needs to be loaded
      const page1 = await page1Promise;
      this._loadList(page1);
      this._updateDom();
      const pagesId = arrayRange(page1.max - 2, 2);

      for (let chunk of arrayToChunk(pagesId, 10)) {
        const promises = [];
        for (let pageId of chunk) {
          promises.push(
            this.loadList(pageId)
          );
        }
        const pages = await Promise.all(promises);
        for (let page of pages) {
          this._loadList(page);
        }
      }

    } catch (error) {
      console.error(error);
      this.textToast('You have no internet access :(')
      let list = this.novelListDefault.concat([{ title: 'Sorry', desc: 'You have no internet access :(', error: error }]);
      this.novelListDefault = list;
    } finally {
      this.isLoading = false;
      this._updateDom();
    }
  }

  loadList(page: number=1): Promise<any> {
    // console.log(`in loadList(${page})`)
    let genre = this.genres[this.genreFilter];
    return this.getNovelPlatform().getNovelList(genre, page);
  }

  sortNovelList(field: string) { // unused for now
    this.novelListDefault.sort((a, b) => {
      if (a[field] < b[field]) return -1;
      if (a[field] > b[field]) return 1;
      return 0;
    })
  }

  _loadList(search: any) {
    console.log(search);
    this.novelListDefault = this.novelListDefault.concat(search.list);
    // this.novelSearch = search;
    // this._updateDom();
  }

  _updateDom(list=this.novelListDefault) {
    this._list.next(list);
  }

  _getItems(val: string) {
    if (this.isLoading) {
      return;
    }
    let tmpList = this.novelListDefault;
    console.log('search= ' + val);

    if (val.length > 0) {
      const filter = val.toLowerCase();
      const filtered = tmpList.filter((item) => {
        const title: string = item.title.toLowerCase();
        return (title.indexOf(filter) > -1);
      });
      if (filtered.length > 0) {
        this._updateDom(filtered);
      } else {
        this._updateDom([
          { title: 'Sorry', desc: `No results matching: ${val}`, error: 'Nothing matching' }
        ]);
      }
    } else {
      this._updateDom(tmpList);
    }
  }

  genreFilterChange(event) {
    this.content.scrollTop = 0;
    this.loadListAll();
  }

  novelPlatformChange(event) {
    this.updatePlatformSelection(event);
    this.loadListAll().then(() => {
      console.log('loadListAll over')
    });
  }

  selNovel(novel) {
    if (novel.error)
      return;

    console.log(novel)
    this.navCtrl.push('PopoverNovelPage', {
      novel: this.novelService.novelKwargs(novel),
      origin: 'explore'
    })
  }

  async doRefresh(refresher) {
    console.log('Begin async operation', refresher);
    await this.loadListAll();
    console.log('Async operation has ended');
    refresher.complete();
  }
}
