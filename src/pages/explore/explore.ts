import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Events, Content } from 'ionic-angular';
import { Wuxiaco, Novel } from '../../providers/wuxiaco';

@Component({
  selector: 'page-explore',
  templateUrl: 'explore.html'
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
    private novelService: Wuxiaco
  ) {
    this.novelListDefault = [
      { title: 'Test'},
      { title: 'Thiz'},
    ]
    this.novelList = this.novelListDefault;
    this.genres = this.novelService.GENRE;
    this.genreFilter = this.genres[0][0];
  }

  ionViewDidLoad() {
    window['thiz'] = this;
    console.log('ionViewDidLoad ExplorePage');

    this.loadListAll().then((search) => {
      console.log('loadListAll over')
      console.log(search)
    });
  }

  loadListAllForce(): Promise<any> {
    return this.loadListAll(true);
  }

  loadListAll(force=false): Promise<any> {
    let asyncLoad = (page): Promise<any> => {
      return this.loadList(page, force).then((search) => {
        if (search.currentPage < search.max) {
          return asyncLoad(page + 1);
        }
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
      }, (error) => {
        reject(error);
        console.error(error);
      });
    })
  }

  _loadList(search: any) {
    if (search.currentPage == 1) {
      this.novelListDefault = this.novelList = search.list;
    } else {
      this.novelListDefault = this.novelList = this.novelListDefault.concat(search.list);
    }
    this.novelSearch = search;
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
    this.events.publish('change:novel', this.novelService.novel(novel.novelObject));
  }

  doRefresh(refresher) {
    console.log('Begin async operation', refresher);
    this.loadListAllForce().then(() => {
      console.log('Async operation has ended');
      refresher.complete();
    });
  }
}
