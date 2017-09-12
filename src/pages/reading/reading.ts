import { ViewChild, Component, ElementRef } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

import { IonicPage, NavController, NavParams, ModalController, MenuController,
  Content, Platform, Events, PopoverController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { Storage } from '@ionic/storage';
import 'rxjs/add/operator/map';

import { PopoverChapterPage } from '../popover-chapter/popover-chapter';
import { PopoverReadPage } from '../popover-read/popover-read';
import { NovelPlatform } from '../../providers/novelPlatform';
import { PlatformManager } from '../../providers/platformManager';

import { Novel } from '../../providers/novel';
import { BookmarkProvider } from '../../providers/bookmark-provider';
import { ReaderProvider } from '../../providers/reader-provider';
// import { LockTask } from '../../providers/lock-task';

import { MultiTapHandler } from './multi-tap-handler';
import { GoogleAnalytics } from '@ionic-native/google-analytics';

const ST_R_SETTINGS = 'reader-settings';
const ST_CURRENT_NOVEL = 'current-novel';
const DEFAULT_NOVEL = {
  title: 'MartialGodAsura',
  id: 'Martial-God-Asura'
};

const setTimeout = window.setTimeout;
const wait = (to: number) => new Promise(r => setTimeout(r, to));

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
    )
  ],
})
export class ReadingPage {
  @ViewChild('pageContent') content: Content;
  contentPromise: Promise<Content>;

  @ViewChild('pageContent', { read: ElementRef }) contentEref: ElementRef;
  @ViewChild('articleBody', { read: ElementRef }) textEref: ElementRef;

  public paragraphs: any;
  public readerSettings: any;
  public currentChapter: number;
  public hideUi: boolean;

  private disableNav: boolean = false;

  maxChapter: number;
  novel: Novel;
  tapHandler: MultiTapHandler;
  analytics: Promise<GoogleAnalytics>;
  timestamp: number;

  constructor(public statusBar: StatusBar,
    public navCtrl: NavController,
    public navParams: NavParams,
    public modalCtrl: ModalController,
    public menuCtrl: MenuController,
    public storage: Storage,
    public platform: Platform,
    public events: Events,
    public popoverCtrl: PopoverController,

    private novelService: PlatformManager,
    private bookmarkProvider: BookmarkProvider,
    private readerProvider: ReaderProvider,
    // private lockTask: LockTask
  ) {
    this.readerProvider.setView(this);

    this.novel = null;
    this.hideUi = false;
    this.statusBar.overlaysWebView(false);
    this.readerSettings = {
      fontFamily: 'roboto',
      fontSize: '4vw',
      bgClass: 'bg-black'
    };

    console.log('Hello ReadingPage constructor');
    this.analytics = window['gaTrackerStarted'];
    this.timestamp = Date.now();

    this.contentPromise = this.waitForContent();
    this.contentPromise.then((viewContent) => {
      viewContent.ionScrollEnd.subscribe((event) => {
        this.onScrollEnd(event.scrollTop);
      });
    })

    this.registerEvents();
    this.storage.get(ST_R_SETTINGS).then(settings => {
      if (settings) {
        this.readerSettings = settings;
      }
    });

    console.log(this.navParams.data);
    this.initNovel().then(novel => {
      if (novel) {
        return this.loadNovel(novel);
      }
    }).then(() => {
      this.events.publish('toggle:splashscreen');
    })

  }

  async ionViewDidLoad() {
    console.log('VIEW DID LOAD');
    (await this.analytics).trackView("Reading Page");
  }

  ionViewDidEnter() {
    console.log('VIEW DID ENTER')
    window['thiz'] = this;
  }

  async ionViewWillEnter() {
    console.log('VIEW WILL ENTER');
  }

  ionViewDidUnload() {
    console.log('VIEW DID UNLOAD');
  }

  ionViewDidLeave() {
    this.readerProvider.viewInactive(this);
    console.log('VIEW DID LEAVE');
  }

  textToast(text: string, time: number = 2000) {
    this.events.publish('toast', text, time);
  }

  onPreviousChapter() {
    console.log('VUP, chapter is now ' + (this.currentChapter - 1))
    this.prevChapter();
  }

  onNextChapter() {
    console.log('VDOWN, chapter is now ' + (this.currentChapter + 1))
    this.nextChapter();
  }

  onScrollEnd(scrollTop) {
    this.novel.setScroll(this.currentChapter, scrollTop);
  }

  onBackGroundChange(bg) {
    this.readerSettings.bgClass = bg;
  }

  registerEvents() {
    console.log('REGISTER EVENTS');

    this.tapHandler = new MultiTapHandler(3, 600);
    this.tapHandler.observable.subscribe(() => {
      console.log('tap!!')
      this.toggleInterface();
    });
  }

  async loadNovel(novel: Novel) {
    this.novel = novel;
    this.storage.set(ST_CURRENT_NOVEL, this.novel.meta());

    console.log(this.novel)
    const maxChapter = await this.getMaxChapter();
    console.log('maxChapter= ' + maxChapter);
    const currentChapter = await this.novel.getCurrentChapter();
    this.loadAhead(currentChapter, 2, maxChapter);
    await this.loadChapter(currentChapter, maxChapter);
    this.content.fullscreen = true;
    (await this.analytics).trackEvent('novel', 'load', novel.title);
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

  async waitForContent(): Promise<Content> {
    while(true) {
      try {
        let st = this.content.scrollTop;
        this.content.scrollTop = st;
        break;
      } catch(error) {
        // wait and retry
        await wait(50);
      }
    }
    return this.content;
  }

  async setChapterContent(data: any, scroll: number) {
    this.paragraphs = data;
    let viewContent = await this.contentPromise;
    await wait(10);
    viewContent.scrollTop = scroll;
  }

  async loadChapter(chapter: number, maxChapter: number, changeChapter: boolean=true, refresh: boolean=false) {
    if (chapter < 1 || (maxChapter && chapter > maxChapter)) {
      this.textToast("Chapter " + chapter + " doesn't exist. Max is " + maxChapter);
    }

    if (chapter < 1) {
      chapter = 1;
    }
    if (maxChapter && chapter > maxChapter) {
      chapter = maxChapter;
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
      content = [ error ];
    }
    if (content) {
      this.currentChapter = chapter;
      await this.novel.setCurrentChapter(chapter);
      // view loaded, should scroll to saved scroll point if available
      await this.setChapterContent(content, scroll);
      return await this.bookmarkProvider.updateNovel(this.novel);
    }
    return null;
  }

  async loadAhead(chapter, ahead, maxChapter) {
    const chapters = [];
    for (let i = 0; i < ahead && i + chapter <= maxChapter; i++) {
      chapters.push(chapter + i);
    }
    const chapterPromises = chapters.map((chapterId) => {
      return this.loadChapter(chapterId, maxChapter, false);
    })
    await Promise.all(chapterPromises);
    console.log('lookAhead over');
  }

  async downloadOffline() {
    const max = await this.novel.download();
    this.textToast('Successfully downloaded ' + max + ' chapters');
    return max;
  }

  async getMaxChapter(): Promise<number> {
    const max = await this.novel.getMaxChapter();
    this.maxChapter = max;
    return max;
  }

  async nextChapter() {
    const maxChapter = await this.getMaxChapter();
    this.disableNav = true;
    this.loadChapter(this.currentChapter + 1, maxChapter).then(() => {
      setTimeout(async () => {
        (await this.analytics).trackEvent("Reading", "NextChapter");
        this.disableNav = false;
      }, 200)
    });
    this.loadAhead(this.currentChapter + 2, 2, maxChapter);
  }

  async prevChapter() {
    if (this.currentChapter > 1) {
      const maxChapter = await this.getMaxChapter();
      this.disableNav = true;
      this.loadChapter(this.currentChapter - 1, maxChapter).then(() => {
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
        // await this.lockTask.start();
        console.log('app is pinned');

      } else {
        // await this.lockTask.stop();
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
    popover.onDidDismiss(async (data) => {
      console.log('popover dismissed');
      this.readerSettings.fontFamily = this.textEref.nativeElement.style.fontFamily;
      this.readerSettings.fontSize = this.textEref.nativeElement.style.fontSize;
      //bgClass already set

      this.storage.set(ST_R_SETTINGS, this.readerSettings);
      let ga = await this.analytics;
      ga.trackEvent('settings', 'setFont', this.readerSettings.fontFamily);
      ga.trackEvent('settings', 'setSize', '' + this.readerSettings.fontSize);
      ga.trackEvent('settings', 'setBgClass', this.readerSettings.bgClass);
    })
    popover.present();
  }

  async presentPopoverChapter() {
    const maxChapter = await this.getMaxChapter();
    let popover = this.popoverCtrl.create(PopoverChapterPage, {
      max: maxChapter,
      current: this.currentChapter
    });
    popover.onDidDismiss(data => {
      if (data) {
        if (data === 'last') {
          this.loadChapter(maxChapter, maxChapter);
        } else if (data === 'first') {
          this.loadChapter(1, maxChapter);
        } else {
          this.loadChapter(data, maxChapter);
        }
      }
    });
    popover.present();
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
      const maxChapter = await this.getMaxChapter();
      await this.loadChapter(this.currentChapter, maxChapter, true, true);
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


