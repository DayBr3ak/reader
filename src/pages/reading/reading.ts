import { ViewChild, Component, ElementRef } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/core';

import { NavController, NavParams, ModalController, MenuController,
  Content, Platform, Events, PopoverController, ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { PopoverChapterPage } from '../popover-chapter/popover-chapter';
import { PopoverReadPage } from '../popover-read/popover-read';
import { PopoverNovelPage } from '../popover-novel/popover-novel';
import { Wuxiaco, Novel } from '../../providers/wuxiaco';
import { BookmarkProvider } from '../../providers/bookmark-provider';
import { GoogleAnalytics } from '@ionic-native/google-analytics';


const ST_R_SETTINGS = 'reader-settings';
const ST_CURRENT_NOVEL = 'current-novel';
const DEFAULT_NOVEL = {
  title: 'MartialGodAsura',
  id: 'Martial-God-Asura'
};

@Component({
  selector: 'page-reading',
  templateUrl: 'reading.html',
  animations: [
    trigger(
      'enterAnimation', [
        transition(':enter', [
          style({ opacity: 0 }),
          animate('100ms', style({ opacity: 1 }))
        ]),
        transition(':leave', [
          style({ opacity: 1 }),
          animate('100ms', style({ opacity: 0 }))
        ])
      ]
    ),

    trigger('flyInOut', [
      state('in', style({
        transform: 'translate3d(0, 0, 0)'
      })),
      state('out', style({
        transform: 'translate3d(150%, 0, 0)'
      })),
      transition('in => out', animate('300ms linear')),
      transition('out => in', animate('300ms linear'))
    ]),

    trigger('changeChapter', [
      state('in', style({
        transform: 'translate3d(0, 0, 0)'
      })),
      state('prev-out', style({
        transform: 'translate3d(150%, 0, 0)'
      })),
      state('next-out', style({
        transform: 'translate3d(-150%, 0, 0)'
      })),
      transition('in => next-out', animate('300ms linear')),
      transition('in => prev-out', animate('300ms linear')),
      transition('next-out => in', [style({transform: 'translate3d(150%, 0, 0)'}), animate('300ms 10ms linear')]),
      transition('prev-out => in', [style({transform: 'translate3d(-150%, 0, 0)'}), animate('300ms 10ms linear')]),
    ]),

    trigger('fade', [
      state('in', style({
        opacity: 1
      })),
      state('out', style({
        opacity: 0
      })),
      transition('in <=> out', animate('200ms linear'))
    ])
  ],
})
export class ReadingPage {
  @ViewChild('pageContent') content: Content;
  @ViewChild('pageContent', { read: ElementRef }) contentEref: ElementRef;
  @ViewChild('articleBody', { read: ElementRef }) textEref: ElementRef;

  public paragraphs: any;
  public readerSettings: any;
  public currentChapter: number;
  public hideUi: boolean;
  public chapList: Array<number>;

  private disableNav: boolean = false;
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

  novel: Novel = null;

  constructor(public statusBar: StatusBar,
    public navCtrl: NavController,
    public navParams: NavParams,
    private http: Http,
    public modalCtrl: ModalController,
    public menuCtrl: MenuController,
    public storage: Storage,
    public platform: Platform,
    public events: Events,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,

    private ga: GoogleAnalytics,
    private novelService: Wuxiaco,
    private bookmarkProvider: BookmarkProvider
  ) {
    this.hideUi = false;
    this.maxChapter = null;
    this.statusBar.overlaysWebView(false);
    this.readerSettings = {
      fontFamily: 'roboto',
      fontSize: '4vw',
      bgClass: 'bg-black'
    }

    this.ga.trackView("Reading Page");
  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
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
      // console.log(event.scrollTop);
      this.novel.setScroll(this.currentChapter, event.scrollTop);
    });

    this.events.subscribe('change:background', (bg) => {
      this.readerSettings.bgClass = bg;
    });
  }

  loadNovel(novel: Novel) {
    this.novel = novel;
    this.storage.set(ST_CURRENT_NOVEL, this.novel.meta());

    let promise1 = new Promise((resolve, reject) => {
      this.novel.getCurrentChapter().then((currentChapter) => {
        this.loadAhead(currentChapter, 2, this.maxChapter);
        return this.loadChapter(currentChapter)
      })
      .then(() => {
        this.content.fullscreen = true;
        resolve();
      })
    })

    let promise2 = new Promise((resolve, reject) => {
      this.novel.getMaxChapter().then((maxChapter) => {
        this.maxChapter = maxChapter;
        console.log('maxChapter= ' + maxChapter)
        resolve();
      })
    })

    return Promise.all([promise1, promise2]);
  }

  myViewDidLoad() {
    this.registerEvents();
    this.storage.get(ST_R_SETTINGS).then((setts) => {
      if (setts) {
        this.readerSettings = setts;
      }
    });


    this.initNovel().then((novel) => {
      if (novel)
        this.loadNovel(novel);
    });
  }

  initNovel(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.navParams.data && this.navParams.data.novel) {
        let novel = this.novelService.novelKwargs(this.navParams.data.novel);
        resolve(novel);
      } else {
        this.storage.get(ST_CURRENT_NOVEL).then(novel => {
          if (novel) {
            resolve(this.novelService.novelKwargs(novel));
          } else {
            let novel = this.novelService.novelKwargs(DEFAULT_NOVEL);
            novel.getMoreMeta(true)
            .then(() => {
              resolve(novel);
            })
            .catch((error) => {
              this.textToast('You have no internet access :(')
              console.log(error);
              this.paragraphs = ['You have no internet access :(']
              this.novel = null;
              resolve(null);
            });
          }
        })
      }
      console.log('ionViewDidLoad ReadingPage');
    })
  }

  ionViewDidEnter() {
    console.log('enter!!!')
    window['rm'] = () => {
      this.resetDownloadedChapters();
    }
    window['goto'] = (n) => {
      this.platform.zone.run(() => {
        this.loadChapter(n);
      });
    }
    window['thiz'] = this;

    this.storage.ready().then(() => {
      // if (this.platform.is('cordova')) {
        this.myViewDidLoad();
      // } else {
        // this.resetDownloadedChapters(() => {
          // this.myViewDidLoad();
        // });
      // }
    })
  }

  setChapterContent(content: any, scroll: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.paragraphs = content;
      setTimeout(() => {
        this.content.scrollTop = scroll;
        // console.log('scroll= ' + scroll + ', chapter= ' + this.currentChapter);
        // console.log('ss= ' + this.content.scrollTop);
        resolve();
      }, 100);
    })
  }

  loadChapter(chapter, changeChapter=true): Promise<any> {
    let resolve = null;
    let reject = null;

    if (chapter < 1 || (this.maxChapter && chapter > this.maxChapter)) {
      this.textToast("Chapter " + chapter + " doesn't exist. Max is " + this.maxChapter);
    }

    if (chapter < 1) {
      chapter = 1;
    }
    if (this.maxChapter && chapter > this.maxChapter) {
      chapter = this.maxChapter;
    }
    console.log('loadchapter ' + chapter);

    let afterLoad = (content: any) => {
      this.currentChapter = chapter;
      this.novel.setCurrentChapter(chapter);
      // view loaded, should scroll to saved scroll point if available
      this.novel.getScroll(chapter).then((chScroll) => {
        let _scroll = chScroll? chScroll: 0;
        console.log('scroll: ' + _scroll)
        this.setChapterContent(content, _scroll).then(() => {
          resolve();
        });
      });
    }

    let scrap = () => {
      this.novel.scrap(chapter).then((data) => {
        let paragraphs;
        paragraphs = data;
        this.novel.cacheChapterContent(chapter, paragraphs);
        if (changeChapter) {
          return afterLoad(paragraphs);
        }
        resolve();
      })
      .catch((error) => {
        if (changeChapter) {
          this.textToast('You have no internet access :(');
          return afterLoad([error.message]);
        }
        resolve();
      });
    }

    this.novel.getChapterContent(chapter).then((content) => {
      if (content) {
        if (changeChapter) {
          return afterLoad(content);
        }
        resolve();
      } else {
        scrap();
      }
    });

    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    })
  }

  loadAhead(chapter, ahead, maxChapter, notify=null): Promise<any> {
    return new Promise((resolve, reject) => {
      let finish = () => {
        console.log('lookAhead over');
        resolve();
      };
      let syncLook = (i) => {
        if (i >= ahead || i + chapter >= maxChapter) {
          finish();
          return;
        }
        this.loadChapter(chapter + i, false).then(() => {
          syncLook(i + 1);
          notify && notify(i);
        })
        .catch((error) => {
          reject(error);
        });
      };
      syncLook(0);
    })
  }

  downloadOffline(): Promise<any> {
    return new Promise((resolve, reject) => {
      let finish = () => {
        this.textToast('Successfully downloaded ' + this.maxChapter + ' chapters');
        resolve();
      };
      // this.loadAhead(1, this.maxChapter, this.maxChapter, null, finish);
      this.novel.download().then(finish).catch(reject);
    })
  }

  resetDownloadedChapters(complete=null) {
    let currentChapter;
    let currentChapterScroll;
    let rSettings;
    this.novel.getCurrentChapter().then((v) => {
      currentChapter = v;
      return this.novel.getScroll(currentChapter);
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
      return this.novel.setCurrentChapter(currentChapter);
    })
    .then(() => {
      return this.novel.setScroll(currentChapter, currentChapterScroll);
    })
    .then(() => {
      complete && complete();
      console.log('data reset!')
    })
  }

  nextChapter() {
    this.disableNav = true;
    this.loadChapter(this.currentChapter + 1).then(() => {
      setTimeout(() => {
        this.ga.trackEvent("Reading", "NextChapter");
        this.disableNav = false;
      }, 200)
    });
    this.loadAhead(this.currentChapter + 2, 2, this.maxChapter);
  }

  prevChapter() {
    if (this.currentChapter > 1) {
      this.disableNav = true;
      this.loadChapter(this.currentChapter - 1).then(() => {
        setTimeout(() => {
          this.disableNav = false;
        }, 200)
      });
    }
  }

  hideInterface() {
    console.log('tap!!')
    this.hideUi = !this.hideUi;
    this.menuCtrl.swipeEnable(!this.hideUi);
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
      this.ga.trackEvent('settings', 'setFont', this.readerSettings.fontFamily);
      this.ga.trackEvent('settings', 'setSize', '' + this.readerSettings.fontSize);
      this.ga.trackEvent('settings', 'setBgClass', this.readerSettings.bgClass);
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

  addBookmark(novel: Novel) {
    if (!this.novel)
      return;
    this.events.publish('add:bookmark', this.novel);
  }

  openDetails() {
    if (!this.novel)
      return;
    this.navCtrl.push(PopoverNovelPage, {
      novel: this.novel,
      origin: 'reading'
    });
  }

  doRefresh(refresher) {
    console.log('Begin async operation', refresher);

    if (this.novel) {
      this.loadChapter(this.currentChapter).then(() => {
        console.log('Async operation has ended');
        refresher.complete();
      });
    } else {
      this.initNovel().then((novel) => {
        if (novel) {
          return this.loadNovel(novel).then(() => {
            refresher.complete();
          });
        } else {
          refresher.complete();
        }
      });
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



