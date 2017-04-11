import { ViewChild, Component, ElementRef } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/core';

import { NavController, NavParams, ModalController,
  Content, Platform, Events, PopoverController, ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { PopoverChapterPage } from '../popover-chapter/popover-chapter';
import { PopoverReadPage } from '../popover-read/popover-read';
import { Wuxiaco, Novel } from '../../providers/wuxiaco';

const ST_R_SETTINGS = 'reader-settings';
const ST_CURRENT_NOVEL = 'current-novel';

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
    public storage: Storage,
    public platform: Platform,
    public events: Events,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,

    private novelService: Wuxiaco
  ) {
    this.hideUi = false;
    this.maxChapter = null;
    this.statusBar.overlaysWebView(false);
    this.readerSettings = {
      fontFamily: 'roboto',
      fontSize: '4vw',
      bgClass: 'bg-black'
    }

    // this.novel = novelService.novel({name: 'MGA', id: 'mga'});
    // this.novel = novelService.novel({name: 'Tales of D&G', id: 'tdg'});
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

    this.events.subscribe('change:novel', (novel) => {
      this.novel = this.novelService.novel(novel);
      this.loadNovel();
    })
  }

  loadNovel() {
    this.storage.set(ST_CURRENT_NOVEL, this.novel.meta());
    this.novel.getCurrentChapter().then((currentChapter) => {
      this.loadChapter(currentChapter, () => {
        this.content.fullscreen = true;
        this.loadAhead(currentChapter, 2, this.maxChapter);
      });
    })
    this.novel.getMaxChapter().then((maxChapter) => {
      this.maxChapter = maxChapter;
      console.log('maxChapter= ' + maxChapter)
    })
  }

  myViewDidLoad() {
    this.registerEvents();
    this.storage.get(ST_R_SETTINGS).then((setts) => {
      if (setts) {
        this.readerSettings = setts;
      }
    });
    this.storage.get(ST_CURRENT_NOVEL).then(novel => {
      if (novel) {
        this.novel = this.novelService.novel(novel);
      } else {
        this.novel = this.novelService.novel({name: 'MartialGodAsura', id: 'Martial-God-Asura'});
      }
      this.loadNovel();
    })
    console.log('ionViewDidLoad ReadingPage');
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

  setChapterContent(content: any, scroll: number, callback=null) {
    this.paragraphs = content;
    setTimeout(() => {
      this.content.scrollTop = scroll;
      // console.log('scroll= ' + scroll + ', chapter= ' + this.currentChapter);
      // console.log('ss= ' + this.content.scrollTop);
      callback && callback();
    }, 100)
  }

  loadChapter(chapter, callback=null, changeChapter=true) {
    console.log('loadchapter ' + chapter);
    if (chapter < 1 || (this.maxChapter && chapter > this.maxChapter)) {
      this.textToast("Chapter " + chapter + " doesn't exist.");
      callback && callback();
      return;
    }

    let afterLoad = (content: any) => {
      this.currentChapter = chapter;
      this.novel.setCurrentChapter(chapter);
      // view loaded, should scroll to saved scroll point if available
      this.novel.getScroll(chapter).then((chScroll) => {
        let _scroll = chScroll? chScroll: 0;
        console.log('scroll: ' + _scroll)
        this.setChapterContent(content, _scroll, callback);
      });
    }

    let scrap = () => {
      this.novel.scrap(chapter).then((data) => {
        let paragraphs;
        if (data.error) {
          paragraphs = [data.error];
        } else {
          paragraphs = data;
          this.novel.cacheChapterContent(chapter, paragraphs);
        }
        if (changeChapter) {
          return afterLoad(paragraphs);
        }
        callback && callback();
      });
    }

    this.novel.getChapterContent(chapter).then((content) => {
      if (content) {
        if (changeChapter) {
          return afterLoad(content);
        }
        callback && callback();
      } else {
        scrap();
      }
    });
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
    // this.loadAhead(1, this.maxChapter, this.maxChapter, null, finish);
    this.novel.download().then(finish);
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
    this.loadChapter(this.currentChapter + 1, () => {
      setTimeout(() => {
        this.disableNav = false;
      }, 200)
    });
    this.loadAhead(this.currentChapter + 2, 2, this.maxChapter);
  }

  prevChapter() {
    if (this.currentChapter > 1) {
      this.disableNav = true;
      this.loadChapter(this.currentChapter - 1, () => {
        setTimeout(() => {
          this.disableNav = false;
        }, 200)
      });
    }
  }

  hideInterface() {
    console.log('tap!!')
    this.hideUi = !this.hideUi;
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



