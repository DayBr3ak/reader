import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Events, Content, Platform, PopoverController, ToastController } from 'ionic-angular';
import { Wuxiaco } from '../../providers/wuxiaco';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

@IonicPage()
@Component({
  selector: 'page-explore',
  templateUrl: 'explore.html',
})
export class ExplorePage {
  @ViewChild('content') content: Content;

  novelList: any;
  novelListDefault: any;
  novelSearch: any;
  genres: any;
  genreFilter: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private events: Events,
    private plt: Platform,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,

    private ga: GoogleAnalytics,
    private novelService: Wuxiaco
  ) {
    this.novelListDefault = [{ title: 'Dummy', desc: 'This is a dummy'}];
    this.novelList = this.novelListDefault;
    this.genres = this.novelService.GENRE;
    this.genreFilter = this.genres[0][0];
    this.ga.trackView("Explore Page");
  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  ionViewDidLoad() {
    window['thiz'] = this;
    console.log('ionViewDidLoad ExplorePage');

    this.loadListAll().then(() => {
      console.log('loadListAll over')
    });
  }

  loadListAll(): Promise<any> {
    this.novelListDefault = [];
    this.novelList = [];

    // see https://developers.google.com/web/fundamentals/getting-started/primers/promises
    // basically all networking promises start simultaneously
    // then they are reduced sequentially to keep the order
    // as they complete the elements are added in the correct order
    const chapter1Promise = this.loadList(1).then((search: any) => {
      // need the first chapter to know how many page needs to be loaded
      const list = [];
      for (let i = 2; i <= search.max; i++) {
        list.push(i);
      }
      const chapterPromiseList = list.map(this.loadList.bind(this));
      chapterPromiseList.unshift(Promise.resolve(search)); // here we keep the result from the first page as a promise
      return chapterPromiseList;
    })
    .then((chapterPromiseList) => {
      return chapterPromiseList
        .reduce((sequence, chapterPromise) => {
          return sequence.then(() => {
            return chapterPromise;
          })
          .then((chapterSearch) => {
            this._loadList(chapterSearch);
          })
        }, Promise.resolve())
    })
    .catch((error) => {
      this.textToast('You have no internet access :(')
      let list = this.novelListDefault.concat([{ title: 'Sorry', desc: 'You have no internet access :(', error: error }]);
      this.novelListDefault = list;
      this.novelList = this.novelListDefault;
      return 0;
    });

    return chapter1Promise;
  }

  loadList(page: number=1): Promise<any> {
    // console.log(`in loadList(${page})`)
    let genre = this.genres[this.genreFilter];
    return this.novelService.getNovelList(genre, page);
  }

  sortNovelList(field: string) {
    this.novelListDefault.sort((a, b) => {
      if (a[field] < b[field]) return -1;
      if (a[field] > b[field]) return 1;
      return 0;
    })
    this.novelList = this.novelListDefault;
  }

  _loadList(search: any) {
    console.log(search);
    this.novelListDefault = this.novelListDefault.concat(search.list);
    this.novelSearch = search;
    this.novelList = this.novelListDefault;
  }

  getItems(event) {
    this.novelList = this.novelListDefault;
    let val = event.target.value;
    console.log('search= ' + val);

    if (val && val.trim() != '') {
      this.novelList = this.novelList.filter((item) => {
        return (item.title.toLowerCase().indexOf(val.toLowerCase()) > -1);
      })
    }
  }

  genreFilterChange(event) {
    this.content.scrollTop = 0;
    this.loadListAll();
  }

  selNovel(novel) {
    if (novel.error)
      return;

    this.navCtrl.push('PopoverNovelPage', {
      novel: this.novelService.novelKwargs(novel),
      origin: 'explore'
    })
  }

  doRefresh(refresher) {
    console.log('Begin async operation', refresher);
    this.loadListAll().then(() => {
      console.log('Async operation has ended');
      refresher.complete();
    });
  }
}
