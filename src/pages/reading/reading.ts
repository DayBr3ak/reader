import { ViewChild, Component, ElementRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/core';

import { NavController, NavParams, ModalController, Content, Platform, Events, PopoverController } from 'ionic-angular';
import { Http } from '@angular/http';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { ReadModalPage } from '../read-modal/read-modal';
import { PopoverReadPage } from '../popover-read/popover-read';

@Component({
  selector: 'page-reading',
  templateUrl: 'reading.html',
  animations: [
    trigger(
      'enterAnimation', [
        transition(':enter', [
          style({transform: 'translateY(0)', opacity: 0}),
          animate('100ms', style({transform: 'translateY(0)', opacity: 1}))
        ]),
        transition(':leave', [
          style({transform: 'translateY(0)', opacity: 1}),
          animate('100ms', style({transform: 'translateY(0)', opacity: 0}))
        ])
      ]
    )
  ],
})
export class ReadingPage {
  @ViewChild('pageContent') content: Content;
  @ViewChild('pageContent', { read: ElementRef }) contentEref: ElementRef;
  @ViewChild('articleBody', { read: ElementRef }) textEref: ElementRef;

  public novelName: string = 'MGA';
  public paragraphs: any;
  public readerSettings: any;
  public currentChapter: number;
  public maxChapter: number;
  public hideUi: boolean;
  public chapList: Array<number>;

  constructor(public statusBar: StatusBar,
    public navCtrl: NavController,
    public navParams: NavParams,
    private http: Http,
    public modalCtrl: ModalController,
    public storage: Storage,
    public platform: Platform,
    public events: Events,
    public popoverCtrl: PopoverController
  ) {
    this.hideUi = false;
    this.maxChapter = null;
    this.statusBar.overlaysWebView(false);
    this.readerSettings = {
      fontFamily: 'roboto',
      fontSize: '4vw',
      bgClass: 'bg-black'
    }
    // this.statusBar.show();
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

  registerEvents() {
    this.events.subscribe('volume:up', () => {
      console.log('VUP, chapter is now ' + (this.currentChapter - 1))
      this.prevChapter();
    })

    this.events.subscribe('volume:down', () => {
      console.log('VDOWN, chapter is now ' + (this.currentChapter + 1))
      this.nextChapter();
    })

    this.content.enableScrollListener();
    this.content.ionScrollEnd.subscribe((event) => {
      this.storage.set('mga-chapter-scroll-' + this.currentChapter, event.scrollTop);
    });

    this.events.subscribe('change:background', (bg) => {
      this.readerSettings.bgClass = bg;
    });
  }

  myViewDidLoad() {
    this.registerEvents();

    this.storage.get('reader-settings').then((setts) => {
      if (setts) {
        this.readerSettings = setts;
      }
    });

    console.log('ionViewDidLoad ReadingPage');
    this.storage.get('mga-current-chapter').then((val) => {
      let currentChapter;
      if (val) {
        currentChapter = val;
      } else {
        currentChapter = 1;
      }
      this.loadChapter(currentChapter, () => {
        this.content.fullscreen = true;
        this.loadAhead(currentChapter, 3);
      });
    })
    this.getNbChapter();
  }

  ionViewDidLoad() {
    this.storage.ready().then(() => {
      this.myViewDidLoad();
    })
  }

  loadChapter(chapter, callback=null, changeChapter=true) {
    let afterLoad = () => {

      if (changeChapter) {
        this.currentChapter = chapter;
        this.storage.set('mga-current-chapter', this.currentChapter);


        // view loaded, should scroll to saved scroll point if available
        this.storage.get('mga-chapter-scroll-' + this.currentChapter).then((scroll) => {
          console.log('scroll: ' + scroll)
          this.content.scrollTop = scroll? scroll: 0;
          if (callback) {
            callback();
          }
        });
      } else {
        if (callback)
          callback();
      }
    }

    let scrap = (chapter) => {
      this.scrap(chapter, (paragraphs) => {
        if (changeChapter) {
          this.paragraphs = paragraphs;
        }

        // TODO maybe store scroll so when you get back it's the same?
        this.storage.set('mga-chapter-txt-' + chapter, paragraphs)
        afterLoad();
      });
    }

    this.storage.get('mga-chapter-txt-' + chapter).then((data) => {
      if (data) {
        if (changeChapter) {
          this.paragraphs = data;
        }
        afterLoad();
      } else {
        scrap(chapter);
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

  loadAhead(chapter, ahead) {
    if (chapter < 1600) {
      for (let i = 1; i <= ahead; i++) {
        this.loadChapter(chapter + i, null, false);
      }
    }
  }

  nextChapter() {
    this.loadChapter(this.currentChapter + 1);
    this.loadAhead(this.currentChapter + 1, 3);
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

  hideInterface() {
    console.log('tap!!')
    this.hideUi = !this.hideUi;
    if (this.hideUi) {
      // this.statusBar.hide();
      // this.content.resize();

    } else {
      // this.statusBar.show();
    }
  }

  chapterModal() {
    this.presentModal();
  }

  presentPopover() {
    let popover = this.popoverCtrl.create(PopoverReadPage, {
      contentEle: this.contentEref.nativeElement,
      textEle: this.textEref.nativeElement,
      bgClass: this.readerSettings.bgClass
    });
    popover.onDidDismiss((data) => {
      console.log('popover dismissed');
      this.readerSettings.fontFamily = this.textEref.nativeElement.style.fontFamily;
      this.readerSettings.fontSize = this.textEref.nativeElement.style.fontSize;
      //bgClass already set

      this.storage.set('reader-settings', this.readerSettings);
    })
    popover.present();
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



