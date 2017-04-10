import { ViewChild, Component, ElementRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/core';

import { compressToBase64, decompressFromBase64 } from 'lz-string';

import { NavController, NavParams, ModalController,
  Content, Platform, Events, PopoverController, ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { PopoverChapterPage } from '../popover-chapter/popover-chapter';
import { PopoverReadPage } from '../popover-read/popover-read';

const ST_R_SETTINGS = 'reader-settings';
const ST_CURRENT_CHAPTER = 'current-chapter';
const ST_CHAPTER_TXT = 'chapter-txt-';
const ST_CHAPTER_SCROLL = 'chapter-scroll-';

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
  public novelId: string = 'mga'
  public paragraphs: any;
  public readerSettings: any;
  public currentChapter: number;
  public hideUi: boolean;
  public chapList: Array<number>;

  private _maxChapter: number;
  get maxChapter(): number {
    if (this.platform.is('cordova'))
      return this._maxChapter;
    else
      // return DEBUG_DOWNLOAD;
      return this._maxChapter;
  }
  set maxChapter(v: number) {
    this._maxChapter = v;
  }

  constructor(public statusBar: StatusBar,
    public navCtrl: NavController,
    public navParams: NavParams,
    private http: Http,
    public modalCtrl: ModalController,
    public storage: Storage,
    public platform: Platform,
    public events: Events,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController
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

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  getStored(property: string, prefix: string = this.novelId) {
    return this.storage.get(prefix + '-' + property);
  }

  setStored(property: string, val: any, prefix: string = this.novelId) {
    return this.storage.set(prefix + '-' + property, val);
  }

  resolveUrl(num: number) {
    return 'http://m.wuxiaworld.com/mga-index/mga-chapter-' + num + '/';
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
      this.setStored(ST_CHAPTER_SCROLL + this.currentChapter, event.scrollTop);
    });

    this.events.subscribe('change:background', (bg) => {
      this.readerSettings.bgClass = bg;
    });
  }

  myViewDidLoad() {
    this.registerEvents();

    this.storage.get(ST_R_SETTINGS).then((setts) => {
      if (setts) {
        this.readerSettings = setts;
      }
    });

    console.log('ionViewDidLoad ReadingPage');
    this.getStored(ST_CURRENT_CHAPTER).then((val) => {
      let currentChapter;
      if (val) {
        currentChapter = val;
      } else {
        currentChapter = 1;
      }
      this.loadChapter(currentChapter, () => {
        this.content.fullscreen = true;
        this.loadAhead(currentChapter, 2, this.maxChapter);
      });
    })
    this.getNbChapter();
  }

  ionViewDidLoad() {
    window['rm'] = () => {
      this.resetDownloadedChapters();
    }
    window['goto'] = (n) => {
      this.platform.zone.run(() => {
        this.loadChapter(n);
      });
    }
    window['this'] = this;

    this.storage.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.myViewDidLoad();
      } else {
        this.resetDownloadedChapters(() => {
          this.myViewDidLoad();
        });
      }
    })
  }

  loadChapter(chapter, callback=null, changeChapter=true) {
    console.log('loadchapter ' + chapter);
    if (chapter < 1) {
      this.textToast("Chapter " + chapter + " doesn't exist.");
      return;
    }

    let afterLoad = () => {
      if (changeChapter) {
        this.currentChapter = chapter;
        this.setStored(ST_CURRENT_CHAPTER, this.currentChapter);


        // view loaded, should scroll to saved scroll point if available
        this.getStored(ST_CHAPTER_SCROLL + this.currentChapter).then((scroll) => {
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
        let data = JSON.stringify(paragraphs);
        let compressed = compressToBase64(data);
        this.setStored(ST_CHAPTER_TXT + chapter, compressed)
        afterLoad();
      });
    }

    this.getStored(ST_CHAPTER_TXT + chapter).then((data) => {
      if (data) {
        console.log(data);
        if (changeChapter) {
          let uncompressed = decompressFromBase64(data);
          this.paragraphs = JSON.parse(uncompressed);
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
    }, (error) => {
      if (error) console.log(error);
      this.textToast('Error loading chapter: ' + chapter + '; error="' + error.status + ':' + error.statusText + '"');
    }, () => {
      // complete
    })
  }

  loadAhead(chapter, ahead, maxChapter, notify=null, complete=null) {
    let finish = () => {
      console.log('lookAhead over');
      complete && complete();
    };
    let syncLook = (i) => {
      if (i >= ahead || i + chapter >= maxChapter) {
        finish();
        return;
      }
      this.loadChapter(chapter + i, () => {
        syncLook(i + 1);
        notify && notify(i);
      }, false);
    };
    syncLook(0);
  }

  downloadOffline(complete=null) {
    let finish = () => {
      this.textToast('Successfully downloaded ' + this.maxChapter + ' chapters');
      complete && complete();
    };
    this.loadAhead(1, this.maxChapter, this.maxChapter, null, finish);
  }

  resetDownloadedChapters(complete=null) {
    let currentChapter;
    let currentChapterScroll;
    let rSettings;
    this.getStored(ST_CURRENT_CHAPTER).then((v) => {
      currentChapter = v;
      return this.getStored(ST_CHAPTER_SCROLL + currentChapter);
    })
    .then((v) => {
      currentChapterScroll = v;
      return this.storage.get(ST_R_SETTINGS);
    })
    .then((v) => {
      rSettings = v;
      return this.storage.clear();
    })
    .then(() => {
      return this.storage.set(ST_R_SETTINGS, rSettings);
    })
    .then(() => {
      return this.setStored(ST_CURRENT_CHAPTER, currentChapter);
    })
    .then(() => {
      return this.setStored(ST_CHAPTER_SCROLL + currentChapter, currentChapterScroll);
    })
    .then(() => {
      complete && complete();
      console.log('data reset!')
    })
  }

  nextChapter() {
    this.loadChapter(this.currentChapter + 1);
    this.loadAhead(this.currentChapter + 2, 2, this.maxChapter);
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

  presentPopoverRead() {
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

      this.storage.set(ST_R_SETTINGS, this.readerSettings);
    })
    popover.present();
  }

  presentPopoverChapter() {
    if (this.maxChapter) {
      let popover = this.popoverCtrl.create(PopoverChapterPage, {
        max: this.maxChapter,
        current: this.currentChapter
      });
      popover.onDidDismiss(data => {
        if (data) {
          this.loadChapter(data);
        }
      });
      popover.present();
    }
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



