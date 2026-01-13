import {Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {forkJoin, Observable, of, Subject, throwError} from 'rxjs';
import {catchError, switchMap, takeUntil, tap} from 'rxjs/operators';
import {ReaderLoaderService} from './services/reader-loader.service';
import {ReaderViewManagerService} from './services/reader-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';
import {ReaderBookmarkService} from './services/reader-bookmark.service';
import {BookService} from '../../book/service/book.service';
import {ActivatedRoute} from '@angular/router';
import {BookMark, BookMarkService} from '../../../shared/service/book-mark.service';
import {BookPatchService} from '../../book/service/book-patch.service';
import {EpubCustomFontService} from '../epub-reader/service/epub-custom-font.service';
import {EpubViewerSettingV2} from '../../book/model/book.model';
import {EpubReaderHeaderComponent} from './reader-layout/header/epub-reader-header.component';
import {EpubReaderSidebarComponent} from './reader-layout/sidebar/epub-reader-sidebar.component';
import {EpubReaderNavbarComponent} from './reader-layout/navbar/epub-reader-navbar.component';
import {HeaderSettingsDialogComponent} from './reader-layout/header/header-settings-dialog.component';

@Component({
  selector: 'app-epub-reader-v2',
  standalone: true,
  imports: [
    CommonModule,
    EpubReaderHeaderComponent,
    HeaderSettingsDialogComponent,
    EpubReaderSidebarComponent,
    EpubReaderNavbarComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    ReaderLoaderService,
    ReaderViewManagerService,
    ReaderStateService,
    ReaderStyleService,
    ReaderBookmarkService
  ],
  templateUrl: './epub-reader-v2.component.html',
  styleUrls: ['./epub-reader-v2.component.scss']
})
export class EpubReaderV2Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasLoadedOnce = false;
  protected bookId!: number;

  isLoading = true;
  showControls = false;
  showChapters = false;
  chapters: { label: string; href: string }[] = [];

  currentChapterName: string | null = null;
  currentProgressData: any = null;

  bookCoverUrl: string | null = null;
  bookTitle: string = '';
  bookAuthors: string = '';
  bookmarks: BookMark[] = [];

  isCurrentCfiBookmarked = false;
  private currentCfi: string | null = null;

  protected location = inject(Location);
  private loaderService = inject(ReaderLoaderService);
  public viewManager = inject(ReaderViewManagerService);
  public stateService = inject(ReaderStateService);
  private styleService = inject(ReaderStyleService);
  private bookService = inject(BookService);
  private route = inject(ActivatedRoute);
  private bookmarkService = inject(ReaderBookmarkService);
  private bookMarkService = inject(BookMarkService);
  private bookPatchService = inject(BookPatchService);
  private epubCustomFontService = inject(EpubCustomFontService);

  ngOnInit() {
    this.isLoading = true;
    this.initializeFoliate().pipe(
      switchMap(() => this.epubCustomFontService.loadAndCacheFonts()),
      tap(() => this.stateService.refreshCustomFonts()),
      switchMap(() => this.setupView()),
      switchMap(() => this.loadBookFromAPI()),
      tap(() => {
        this.loadBookmarks();
        this.subscribeToStateChanges();
        this.subscribeToViewEvents();
        this.isLoading = false;
      }),
      catchError(err => {
        console.error(err);
        this.isLoading = false;
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeFoliate(): Observable<void> {
    return this.loaderService.loadFoliateScript().pipe(
      switchMap(() => this.loaderService.waitForCustomElement())
    );
  }

  private setupView(): Observable<void> {
    const container = document.getElementById('foliate-container');
    if (!container) {
      return throwError(() => new Error('Container not found'));
    }
    container.setAttribute('tabindex', '0');
    this.viewManager.createView(container);
    return of(undefined);
  }

  private loadBookFromAPI(): Observable<void> {
    this.bookId = +this.route.snapshot.paramMap.get('bookId')!;

    return this.stateService.initializeState(this.bookId).pipe(
      switchMap(() => forkJoin({
        state: this.stateService.initializeState(this.bookId),
        book: this.bookService.getBookByIdFromAPI(this.bookId, false),
        fileBlob: this.bookService.getFileContent(this.bookId)
      })),
      switchMap(({book, fileBlob}) => {
        const fileUrl = URL.createObjectURL(fileBlob);
        this._fileUrl = fileUrl;

        return this.viewManager.loadEpub(fileUrl).pipe(
          tap(() => {
            this.applyStyles();
            this.chapters = this.viewManager.getChapters();
          }),
          switchMap(() => this.viewManager.getMetadata()),
          tap(metadata => {
            this.bookCoverUrl = metadata.coverUrl ?? null;
            this.bookTitle = book.metadata!.title ?? '';
            this.bookAuthors = (book.metadata!.authors ?? []).join(', ');
          }),
          switchMap(() => {
            if (!this.hasLoadedOnce) {
              this.hasLoadedOnce = true;
              return this.viewManager.goTo(book.epubProgress!.cfi);
            }
            return of(undefined);
          })
        );
      })
    );
  }

  private _fileUrl: string | null = null;

  private loadBookmarks(): void {
    this.bookMarkService.getBookmarksForBook(this.bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(bookmarks => {
        this.bookmarks = bookmarks;
        this.updateIsCurrentCfiBookmarked();
      });
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
            const detail = event.detail;
            this.currentProgressData = detail;

            const cfi = detail?.cfi ?? null;
            const href = detail?.pageItem?.href ?? detail?.tocItem?.href ?? null;
            const percentage = typeof detail?.fraction === 'number' ? detail.fraction * 100 : null;

            if (cfi && percentage !== null) {
              this.bookPatchService.saveEpubProgress(this.bookId, cfi, href, percentage);
            }

            const chapterLabel = detail?.tocItem?.label;
            if (chapterLabel && chapterLabel !== this.currentChapterName) {
              this.currentChapterName = chapterLabel;
            }

            if (cfi) {
              this.currentCfi = cfi;
              this.updateIsCurrentCfiBookmarked();
              this.bookmarkService.updateCurrentPosition(cfi, chapterLabel);
            }

            break;
          }
        }
      });
  }

  private updateIsCurrentCfiBookmarked() {
    if (!this.currentCfi || !this.bookmarks?.length) {
      this.isCurrentCfiBookmarked = false;
      return;
    }
    this.isCurrentCfiBookmarked = this.bookmarks.some(b => b.cfi === this.currentCfi);
  }

  private applyStyles(): void {
    const renderer = this.viewManager.getRenderer();
    if (renderer) {
      this.styleService.applyStylesToRenderer(renderer, this.stateService.currentState);
    }
  }

  onChapterClick(href: string) {
    this.viewManager.goTo(href).pipe(
      tap(() => this.showChapters = false),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  onBookmarkClick(cfi: string) {
    this.viewManager.goTo(cfi).pipe(
      tap(() => {
        this.showChapters = false;
        this.currentCfi = cfi;
        this.updateIsCurrentCfiBookmarked();
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  onCreateBookmark() {
    this.bookmarkService.createBookmarkAtCurrentPosition(this.bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.loadBookmarks();
        }
      });
  }

  onDeleteBookmark(bookmarkId: number) {
    this.bookMarkService.deleteBookmark(bookmarkId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadBookmarks();
        },
        error: () => {
        }
      });
  }

  onProgressChange(fraction: number) {
    this.viewManager.goToFraction(fraction)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  onToggleDarkMode() {
    this.stateService.toggleDarkMode();
    this.syncSettingsToBackend();
  }

  onIncreaseFontSize() {
    this.stateService.updateFontSize(1);
    this.syncSettingsToBackend();
  }

  onDecreaseFontSize() {
    this.stateService.updateFontSize(-1);
    this.syncSettingsToBackend();
  }

  onIncreaseLineHeight() {
    this.stateService.updateLineHeight(0.1);
    this.syncSettingsToBackend();
  }

  onDecreaseLineHeight() {
    this.stateService.updateLineHeight(-0.1);
    this.syncSettingsToBackend();
  }

  private syncSettingsToBackend() {
    const setting: EpubViewerSettingV2 = {
      lineHeight: this.stateService.currentState.lineHeight,
      justify: this.stateService.currentState.justify,
      hyphenate: this.stateService.currentState.hyphenate,
      maxColumnCount: this.stateService.currentState.maxColumnCount,
      gap: this.stateService.currentState.gap,
      fontSize: this.stateService.currentState.fontSize,
      theme: typeof this.stateService.currentState.theme === 'object' && 'name' in this.stateService.currentState.theme
        ? this.stateService.currentState.theme.name
        : (this.stateService.currentState.theme as any),
      maxInlineSize: this.stateService.currentState.maxInlineSize,
      maxBlockSize: this.stateService.currentState.maxBlockSize,
      fontFamily: this.stateService.currentState.fontFamily,
      isDark: this.stateService.currentState.isDark,
    };
    this.bookService.updateViewerSetting({epubSettingsV2: setting}, this.bookId).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.viewManager.destroy();
    this.bookmarkService.reset();
    this.epubCustomFontService.cleanup();
    if (this._fileUrl) {
      URL.revokeObjectURL(this._fileUrl);
      this._fileUrl = null;
    }
  }
}
