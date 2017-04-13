import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

/*
  Generated class for the Explore page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-explore',
  templateUrl: 'explore.html'
})
export class ExplorePage {

  novelList: any;
  novelListDefault: any;
  genres: any;
  genreFilter: any;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.novelListDefault = [
      { name: 'Test', genre: "b"},
      { name: 'Thiz', genre: "a"},
    ]
    this.novelList = this.novelListDefault;
    this.genres = [
      {val: 'all', text: 'All'},
      {val: 'a', text: 'A'},
      {val: 'b', text: 'B'},
      {val: 'c', text: 'C'}
    ];
    this.genreFilter = 'all';
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ExplorePage');
  }

  selGenre(event) {
    console.log(event)
  }

  getItems(event) {
    this.novelList = this.novelListDefault;
    let val = event.target.value;
    console.log('search= ' + val);

    if (val && val.trim() != '') {
      this.novelList = this.novelList.filter((item) => {
        return (item.name.toLowerCase().indexOf(val.toLowerCase()) > -1);
      })
    }
  }

  genreFilterFn(novel) {
    return !(this.genreFilter === "all" || novel.genre === this.genreFilter);
  }

}
