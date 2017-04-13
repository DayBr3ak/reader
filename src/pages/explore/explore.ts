import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Events, InfiniteScroll, Content } from 'ionic-angular';
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

    this.loadList();
  }

  loadList(page: number=1): Promise<any> {
    let genre = this.genres[this.genreFilter];
    return new Promise((resolve, reject) => {
      this.novelService.getNovelList(genre, page).then((novelSearch) => {
        this._loadList(novelSearch);
        console.log(novelSearch);
        resolve();
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

  enableInfiniteScroll = true;

  genreFilterChange(event) {
    this.enableInfiniteScroll = true;
    this.content.scrollTop = 0;
    this.loadList();
  }

  selNovel(novel) {
    this.events.publish('change:novel', novel.novelObject);
  }

  doInfinite(infiniteScroll) {
    if (this.novelSearch.currentPage < this.novelSearch.max) {
      this.loadList(this.novelSearch.currentPage + 1).then(() => {
        infiniteScroll.complete();
      })
    } else {
      this.enableInfiniteScroll = false;
    }
  }
}
