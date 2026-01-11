import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {firstValueFrom, forkJoin, Subject, takeUntil} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {FoliateLoaderService} from './services/foliate-loader.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';
import {ReaderNavigationService} from './services/reader-navigation.service';
import {ReaderHeaderComponent} from './reader-header.component';
import {SettingsDialogComponent} from './settings-dialog.component';
import {ChaptersDialogComponent} from './chapters-dialog.component';
import {BookService} from '../../book/service/book.service';
import {ActivatedRoute} from '@angular/router';

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
  protected bookId!: number;

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
    private navigationService: ReaderNavigationService,
    private bookService: BookService,
    private route: ActivatedRoute
  ) {
  }

  async ngOnInit() {
    try {
      await this.initializeFoliate();
      await this.setupView();
      await this.loadBookFromAPI();
      this.subscribeToStateChanges();
      this.subscribeToViewEvents();
      this.navigationService.attachListeners('foliate-container');
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

  private async loadBookFromAPI(): Promise<void> {
    this.bookId = +this.route.snapshot.paramMap.get('bookId')!; // Store bookId

    // Initialize state with user and book settings, then load book
    const [_, book, fileBlob] = await firstValueFrom(
      this.stateService.initializeState(this.bookId).pipe(
        switchMap(() => forkJoin([
          this.stateService.initializeState(this.bookId),
          this.bookService.getBookByIdFromAPI(this.bookId, false),
          this.bookService.getFileContent(this.bookId)
        ]))
      )
    );

    const fileUrl = URL.createObjectURL(fileBlob);
    await this.viewManager.loadEpub(fileUrl);
    this.applyStyles();
    this.chapters = this.viewManager.getChapters();
    const metadata = await this.viewManager.getMetadata();
    this.bookCoverUrl = metadata.coverUrl ?? null;
    this.bookTitle = book.metadata!.title ?? '';
    this.bookAuthors = (book.metadata!.authors ?? []).join(', ');
    if (!this.hasLoadedOnce) {
      await this.viewManager.goToStart();
      this.hasLoadedOnce = true;
    }
    this._fileUrl = fileUrl;
  }


  private _fileUrl: string | null = null;

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
    if (this._fileUrl) {
      URL.revokeObjectURL(this._fileUrl);
      this._fileUrl = null;
    }
  }
}
