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
    let complete = () => {
      // this.sortNovelList('title');
      // console.log('sorted');
      return Promise.resolve();
    }
    let asyncLoad = (page): Promise<any> => {
      return this.loadList(page).then((search) => {
        if (search.currentPage < search.max) {
          return asyncLoad(page + 1);
        } else {
          return complete();
        }
      })
      .catch((error) => {
        this.textToast('You have no internet access :(')
        let list = this.novelListDefault.concat([{ title: 'Sorry', desc: 'You have no internet access :(', error: error }]);
        this.novelListDefault = list;
        this.novelList = this.novelListDefault;
        return complete();
      })
    }
    return asyncLoad(1);
  }

  loadList(page: number=1, force=false): Promise<any> {
    let genre = this.genres[this.genreFilter];
    return new Promise((resolve, reject) => {
      this.novelService.getNovelList(genre, page, force).then((novelSearch) => {
        this._loadList(novelSearch);
        console.log(novelSearch);
        resolve(novelSearch);
      })
      .catch((error) => {
        reject(error);
        console.error(error);
      });
    })
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
