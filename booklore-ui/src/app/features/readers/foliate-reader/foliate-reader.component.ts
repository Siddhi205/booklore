import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Subject, takeUntil} from 'rxjs';
import {FoliateLoaderService} from './services/foliate-loader.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';
import {ReaderNavigationService} from './services/reader-navigation.service';
import {ReaderHeaderComponent} from './reader-header.component';
import {SettingsDialogComponent} from './settings-dialog.component';
import {ChaptersDialogComponent} from './chapters-dialog.component';

@Component({
  selector: 'app-foliate-reader',
  standalone: true,
  imports: [
    CommonModule,
    ReaderHeaderComponent,
    SettingsDialogComponent,
    ChaptersDialogComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    FoliateLoaderService,
    FoliateViewManagerService,
    ReaderStateService,
    ReaderStyleService,
    ReaderNavigationService
  ],
  templateUrl: './foliate-reader.component.html',
  styleUrls: ['./foliate-reader.component.scss']
})
export class FoliateReaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasLoadedOnce = false;

  showControls = false;
  showChapters = false;
  chapters: { label: string; href: string }[] = [];

  currentChapterName: string | null = null;

  bookCoverUrl: string | null = null;
  bookTitle: string = '';
  bookAuthors: string = '';

  constructor(
    private loaderService: FoliateLoaderService,
    public viewManager: FoliateViewManagerService,
    public stateService: ReaderStateService,
    private styleService: ReaderStyleService,
    private navigationService: ReaderNavigationService
  ) {
  }

  async ngOnInit() {
    try {
      await this.initializeFoliate();
      await this.setupView();
      await this.loadBook();
      this.subscribeToStateChanges();
      this.subscribeToViewEvents();
      this.navigationService.attachListeners('foliate-container'); // Pass container ID
    } catch (err) {
    }
  }

  private async initializeFoliate(): Promise<void> {
    await this.loaderService.loadFoliateScript();
    await this.loaderService.waitForCustomElement();
  }

  private async setupView(): Promise<void> {
    const container = document.getElementById('foliate-container');
    if (!container) {
      throw new Error('Container not found');
    }

    this.viewManager.createView(container);
  }

  private async loadBook(): Promise<void> {
    await this.viewManager.loadEpub('/assets/fuck.epub');
    this.applyStyles();
    this.chapters = this.viewManager.getChapters();
    const metadata = await this.viewManager.getMetadata();
    this.bookCoverUrl = metadata.coverUrl ?? null;
    this.bookTitle = metadata.title ?? '';
    this.bookAuthors = (metadata.authors ?? []).join(', ');
    if (!this.hasLoadedOnce) {
      await this.viewManager.goToStart();
      this.hasLoadedOnce = true;
    }
  }

  private subscribeToStateChanges(): void {
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyStyles();
      });
  }

  private subscribeToViewEvents(): void {
    this.viewManager.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        switch (event.type) {
          case 'load':
            this.applyStyles();
            this.chapters = this.viewManager.getChapters();
            break;
          case 'relocate': {
            const chapterLabel = event?.detail?.tocItem?.label;
            if (chapterLabel && chapterLabel !== this.currentChapterName) {
              this.currentChapterName = chapterLabel;
            }
            break;
          }
          case 'error':
            console.error('Foliate view error:', event.detail);
            break;
        }
      });
  }

  private applyStyles(): void {
    const renderer = this.viewManager.getRenderer();
    if (renderer) {
      this.styleService.applyStylesToRenderer(renderer, this.stateService.currentState);
    }
  }

  async onChapterClick(href: string) {
    await this.viewManager.goTo(href);
    this.showChapters = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.viewManager.destroy();
    this.navigationService.detachListeners('foliate-container'); // Pass container ID
  }
}
