import { ViewChild, Component } from '@angular/core';
import { NavController, NavParams, ModalController, Content } from 'ionic-angular';
import { Http } from '@angular/http';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { ReadModalPage } from '../read-modal/read-modal';

@Component({
  selector: 'page-reading',
  templateUrl: 'reading.html'
})
export class ReadingPage {
  @ViewChild(Content) content: Content;

  public novelName: string = 'MGA';
  public paragraphs: any;
  public currentChapter: number;
  public maxChapter: number;
  public hideUi: boolean;
  public chapList: Array<number>;

  constructor(public statusBar: StatusBar, public navCtrl: NavController, public navParams: NavParams, private http: Http, public modalCtrl: ModalController, public storage: Storage) {
    this.hideUi = false;
    this.maxChapter = null;
  }

  presentModal() {
    if (this.maxChapter) {
      let modal = this.modalCtrl.create(ReadModalPage, { max: this.maxChapter, current: this.currentChapter });
      modal.onDidDismiss(data => {
        if (data) {
          this.loadChapter(data);
        }
      });
      modal.present();
    }
  }

  resolveUrl(num) {
    return 'http://www.wuxiaworld.com/mga-index/mga-chapter-' + num;
  }

  ionViewDidLoad() {
    this.content.enableScrollListener();
    this.content.ionScrollEnd.subscribe((event) => {
      this.storage.ready().then(() => {
        this.storage.set('mga-scrolltop', event.scrollTop);
      });
    });


    console.log('ionViewDidLoad ReadingPage');
    this.storage.ready().then(() => {

      this.storage.get('mga').then((val) => {
        let currentChapter;
        if (val && val.currentChapter) {
          currentChapter = val.currentChapter;
        } else {
          currentChapter = 1;
        }
        this.loadChapter(currentChapter, () => {
          // view loaded, should scroll to saved scroll point if available
          this.storage.get('mga-scrolltop').then((sTop) => {
           this.content.scrollTop = sTop? sTop: 0;
          });
          this.content.fullscreen = true;
        });
      })
    });
    this.getNbChapter();
  }

  loadChapter(chapter, callback=null) {
    this.scrap(chapter, (paragraphs) => {
      this.paragraphs = paragraphs;
      // TODO maybe store scroll so when you get back it's the same?
      this.storage.ready().then(() => {
        this.storage.set('mga', {currentChapter: chapter});
      });
      this.currentChapter = chapter;

      if (callback) {
        callback();
      } else {
        // default behavior
        this.content.scrollTop = 0;
      }
    });
  }

  scrap(chapter, callback) {
    let url = this.resolveUrl(chapter);

    let stripScripts = (s, tag) => {
      let div = document.createElement('div');
      div.innerHTML = s;
      let scripts = div.getElementsByTagName(tag);
      let i = scripts.length;
      while (i--) {
          scripts[i].parentNode.removeChild(scripts[i]);
      }
      return div.innerHTML;
    }

    let getArticleBody = (resHtml) => {
      let div = document.createElement('div');
      div.innerHTML = resHtml;

      let articles = div.getElementsByTagName('article');
      let articleBody = articles[0].children[0].children[0].children[2];

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

        let txt = para[i].innerHTML.replace('&nbsp;', ' ');
        txt = txt.replace('&nbsp;', ' ')
        txt = txt.replace(htmlTagRegex, '');
        res.push({ strong: i == 0, text: txt });
      }
      return res;
    }

    this.http.get(url).subscribe((data) => {
      let resHtml = data.text();
      let urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      resHtml = resHtml.replace(urlRegex, '');
      // resHtml = stripScripts(resHtml, 'script');
      resHtml = stripScripts(resHtml, 'meta');
      // resHtml = stripScripts(resHtml, 'link');
      // resHtml = stripScripts(resHtml, 'style');
      resHtml = stripScripts(resHtml, 'header');
      resHtml = stripScripts(resHtml, 'footer');
      resHtml = stripScripts(resHtml, 'img');

      callback(getArticleBody(resHtml));
    })
  }

  nextChapter() {
    this.loadChapter(this.currentChapter + 1);
  }

  prevChapter() {
    if (this.currentChapter > 1) {
      this.loadChapter(this.currentChapter - 1);
    }
  }

  getNbChapter() {
    let url = 'https://gist.githubusercontent.com/ChuTengMga/2b96da48467fa23698da1051fcf5c00a/raw/0b0510521aff26071f22fe825e9fc29ae58c03ff/wu.json';
    this.http.get(url).map(res => res.json()).subscribe((data) => {
      this.maxChapter = data.mga;
    })
  }

  onTap() {
    console.log('tap!!')
    this.hideUi = !this.hideUi;
    if (this.hideUi) {
      this.statusBar.hide();
      this.content.resize();

    } else {
      this.statusBar.show();
    }
  }

  onPress() {
    console.log('press..');
    this.presentModal();
  }
}

`
<ion-list [virtualScroll]="chapList" no-lines>
      <ion-item *virtualItem="let chap" (click)="selectCh(chap)" [attr.id]="createElemId(chap)" [ngClass]="{'current-ch': (isSelected(chap) == true)}">
      <!--<ion-item *ngFor="let k of chapList" (click)="selectCh(k)" [attr.id]="createElemId(k)">-->
        Chapter {{ chap }}
        <ion-note item-right>
        </ion-note>
      </ion-item>
  </ion-list>
`



