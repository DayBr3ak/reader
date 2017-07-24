import { ViewChild, Component, ElementRef } from '@angular/core';
import { trigger, transition, style, animate, state } from '@angular/animations';

import { IonicPage, NavController, NavParams, ModalController, MenuController,
  Content, Platform, Events, PopoverController, ToastController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { PopoverChapterPage } from '../popover-chapter/popover-chapter';
import { PopoverReadPage } from '../popover-read/popover-read';
import { Wuxiaco, Novel } from '../../providers/wuxiaco';
import { BookmarkProvider } from '../../providers/bookmark-provider';
import { LockTask } from '../../providers/lock-task';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

const ST_R_SETTINGS = 'reader-settings';
const ST_CURRENT_NOVEL = 'current-novel';
const DEFAULT_NOVEL = {
  title: 'MartialGodAsura',
  id: 'Martial-God-Asura'
};

@IonicPage()
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

  novel: Novel;
  tapHandler: MultiTapHandler;

  constructor(public statusBar: StatusBar,
    public navCtrl: NavController,
    public navParams: NavParams,
    public modalCtrl: ModalController,
    public menuCtrl: MenuController,
    public storage: Storage,
    public platform: Platform,
    public events: Events,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,

    private ga: GoogleAnalytics,
    private novelService: Wuxiaco,
    private bookmarkProvider: BookmarkProvider,
    private lockTask: LockTask
  ) {
    this.novel = null;
    this.hideUi = false;
    this.maxChapter = null;
    this.statusBar.overlaysWebView(false);
    this.readerSettings = {
      fontFamily: 'roboto',
      fontSize: '4vw',
      bgClass: 'bg-black'
    };

    console.log('Hello ReadingPage constructor');
  }

  async ionViewDidLoad() {
    console.log('VIEW DID LOAD');
    await window['gaTrackerStarted'];
    this.ga.trackView("Reading Page");

    this.registerEvents();
    await this.storage.ready();
    const settings = await this.storage.get(ST_R_SETTINGS);
    if (settings) {
      this.readerSettings = settings;
    }
    const novel = await this.initNovel();
    if (novel) {
      this.loadNovel(novel);
    }
  }

  ionViewDidEnter() {
    console.log('VIEW DID ENTER')
    window['goto'] = (n) => {
      this.platform.zone.run(() => {
        this.loadChapter(n);
      });
    }
    window['thiz'] = this;
  }

  onEnterSetScroll: () => void = null;
  async ionViewWillEnter() {
    console.log('VIEW WILL ENTER');
    this.onEnterSetScroll && this.onEnterSetScroll();
  }

  ionViewDidUnload() {
    console.log('VIEW DID UNLOAD');
  }

  ionViewDidLeave() {
    console.log('VIEW DID LEAVE');
  }

  textToast(text: string, time: number = 2000) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: time
    });
    toast.present();
  }

  registerEvents() {
    console.log('REGISTER EVENTS');

    this.events.subscribe('volume:up', () => {
      console.log('VUP, chapter is now ' + (this.currentChapter - 1))
      this.prevChapter();
    })

    this.events.subscribe('volume:down', () => {
      console.log('VDOWN, chapter is now ' + (this.currentChapter + 1))
      this.nextChapter();
    })

    this.content.ionScrollEnd.subscribe((event) => {
      // console.log("It's scrolling !! " + event.scrollTop);
      this.novel.setScroll(this.currentChapter, event.scrollTop);
    });

    this.events.subscribe('change:background', (bg) => {
      this.readerSettings.bgClass = bg;
    });

    this.tapHandler = new MultiTapHandler(3, 600);
    this.tapHandler.observable.subscribe(() => {
      console.log('tap!!')
      this.toggleInterface();
    });

    this.platform.pause.subscribe(() => {
      this.onPause();
    })
  }

  async loadNovel(novel: Novel) {
    this.novel = novel;
    this.storage.set(ST_CURRENT_NOVEL, this.novel.meta());

    this.maxChapter = await this.novel.getMaxChapter();
    console.log('maxChapter= ' + this.maxChapter);
    const currentChapter = await this.novel.getCurrentChapter();
    this.loadAhead(currentChapter, 2, this.maxChapter);
    await this.loadChapter(currentChapter);
    this.content.fullscreen = true;
    this.ga.trackEvent('novel', 'load', novel.title);
  }

  async initNovel() {
    if (this.navParams.data && this.navParams.data.novel) {
      return this.novelService.novelKwargs(this.navParams.data.novel);
    }
    const novelObj = await this.storage.get(ST_CURRENT_NOVEL);
    if (novelObj) {
      return this.novelService.novelKwargs(novelObj);
    }
    let novel = this.novelService.novelKwargs(DEFAULT_NOVEL);
    try {
      await novel.getMoreMeta(true);
      return novel
    } catch (error) {
      this.textToast('You have no internet access :(')
      console.log(error);
      this.paragraphs = ['You have no internet access :(']
      this.novel = null;
      return null;
    }
  }

  async setChapterContent(content: any, scroll: number) {
    const wait = (to: number) => new Promise(r => setTimeout(r, to));
    this.paragraphs = content;
    await wait(10);
    try {
      this.content.scrollTop = scroll;
      this.onEnterSetScroll = null;
    } catch (error) {
      console.log('DOM paused/not loaded, setting scroll is not possible');
      this.onEnterSetScroll = () => {
        console.log('delayed scroll!');
        this.content.scrollTop = scroll;
        this.onEnterSetScroll = null;
      }
    }
  }

  async loadChapter(chapter: number, changeChapter: boolean=true, refresh: boolean=false) {
    if (chapter < 1 || (this.maxChapter && chapter > this.maxChapter)) {
      this.textToast("Chapter " + chapter + " doesn't exist. Max is " + this.maxChapter);
    }

    if (chapter < 1) {
      chapter = 1;
    }
    if (this.maxChapter && chapter > this.maxChapter) {
      chapter = this.maxChapter;
    }
    console.log('async loadchapter ' + chapter);
    let getContent = async () => {
      try {
        let content = await this.novel.getChapterContent(chapter);
        if (content && !refresh) {
          if (changeChapter) {
            return content;
          }
          return null;
        } else {
          let paragraphs = await this.novel.scrap(chapter);
          this.novel.cacheChapterContent(chapter, paragraphs);
          if (changeChapter) {
            return paragraphs;
          }
          return null;
        }
      } catch (error) {
        if (changeChapter) {
          this.textToast('You have no internet access :(');
          let errMessage = error.message || error;
          throw errMessage;
        }
        return null;
      }
    };

    let content = null;
    let scroll = 0;
    try {
      content = await getContent();
      scroll = await this.novel.getScroll(chapter) || scroll;
    } catch (error) {
      content = error;
    }
    if (content) {
      this.currentChapter = chapter;
      this.novel.setCurrentChapter(chapter);
      // view loaded, should scroll to saved scroll point if available
      return await this.setChapterContent(content, scroll);
    }
    return null;
  }

  async loadAhead(chapter, ahead, maxChapter) {
    const chapters = [];
    for (let i = 0; i < ahead && i + chapter <= maxChapter; i++) {
      chapters.push(chapter + i);
    }
    const chapterPromises = chapters.map((chapterId) => {
      return this.loadChapter(chapterId, false);
    })
    await Promise.all(chapterPromises);
    console.log('lookAhead over');
  }

  async downloadOffline() {
    const max = await this.novel.download();
    this.textToast('Successfully downloaded ' + max + ' chapters');
    return max;
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

  async toggleInterface() {
    this.hideUi = !this.hideUi;
    this.menuCtrl.swipeEnable(!this.hideUi);

    try {
      if (this.hideUi) {
        await this.lockTask.start();
        console.log('app is pinned');

      } else {
        await this.lockTask.stop()
        console.log('app is UNpinned');
      }
    } catch(error) {
      console.log(error)
    }
  }

  onPause() {
    if (this.hideUi) {
      // interface is hidden and probably pinned
      // we want to change that;
      this.toggleInterface();
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
          if (data === 'last') {
            this.loadChapter(this.maxChapter);
          } else if (data === 'first') {
            this.loadChapter(1);
          } else {
            this.loadChapter(data);
          }
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
    this.navCtrl.push('PopoverNovelPage', {
      novel: this.novel,
      origin: 'reading'
    });
  }

  async doRefresh(refresher) {
    console.log('Begin async operation', refresher);

    if (this.novel) {
      await this.loadChapter(this.currentChapter, true, true);
    } else {
      const novel = await this.initNovel();
      if (novel) {
        await this.loadNovel(novel);
      }
    }
    console.log('Async operation has ended');
    refresher.complete();
  }
}

import { Observable } from 'rxjs';


export class MultiTapHandler {

  private tapRequired: number;
  private windowOf: number;
  private tapObservable: Observable<any>;
  private tapObserver: any = null;
  private timeoutHandle: number = null;
  private tapCounter: number = 0;

  constructor (tapRequired: number=2, windowOf: number=600) {
    if (tapRequired < 1) {
      throw 'MultiTapHandler needs at least 1 tap';
    }
    this.tapRequired = tapRequired;
    this.windowOf = windowOf;
    this.tapObservable = Observable.create(observer => {
      this.tapObserver = observer;
      return () => {
        console.log('taphandler disposed');
      }
    });
  }

  private _cancelTimeout() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.tapCounter = 0;
  }

  private _createTimeout() {
    this.timeoutHandle = setTimeout(() => {
        this._cancelTimeout();
        console.log('taphandler timeout')
    }, this.windowOf);
  }

  private _publish() {
    this._cancelTimeout();
    this.tapObserver.next(true);
  }

  tap () {
    if (this.tapRequired === 1) {
      return this._publish();
    }
    if (this.timeoutHandle === null) {
      // first tap, enable timer
      return this._createTimeout();
    }
    if (this.timeoutHandle) {
      this.tapCounter++;
      if (this.tapCounter >= (this.tapRequired - 1)) {
        this._publish();
      }
    }
  }

  get observable(): Observable<any> {
    return this.tapObservable;
  }
}


