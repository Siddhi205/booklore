import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {forkJoin, Observable, of, Subject, throwError} from 'rxjs';
import {catchError, switchMap, takeUntil, tap} from 'rxjs/operators';
import {FoliateLoaderService} from './services/foliate-loader.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';
import {ReaderBookmarkService} from './services/reader-bookmark.service';
import {ReaderHeaderComponent} from './reader-header.component';
import {SettingsDialogComponent} from './settings-dialog.component';
import {EpubReaderLeftSidebarComponent} from './epub-reader-left-sidebar.component';
import {BookService} from '../../book/service/book.service';
import {ActivatedRoute} from '@angular/router';
import {BookMark, BookMarkService} from '../../../shared/service/book-mark.service';
import {BookPatchService} from '../../book/service/book-patch.service';
import {ReaderNavbarComponent} from './reader-navbar.component';

@Component({
  selector: 'app-foliate-reader',
  standalone: true,
  imports: [
    CommonModule,
    ReaderHeaderComponent,
    SettingsDialogComponent,
    EpubReaderLeftSidebarComponent,
    ReaderNavbarComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    FoliateLoaderService,
    FoliateViewManagerService,
    ReaderStateService,
    ReaderStyleService,
    ReaderBookmarkService
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
  currentProgressData: any = null;

  bookCoverUrl: string | null = null;
  bookTitle: string = '';
  bookAuthors: string = '';
  bookmarks: BookMark[] = [];

  constructor(
    private loaderService: FoliateLoaderService,
    public viewManager: FoliateViewManagerService,
    public stateService: ReaderStateService,
    private styleService: ReaderStyleService,
    private bookService: BookService,
    private route: ActivatedRoute,
    private bookmarkService: ReaderBookmarkService,
    private bookMarkService: BookMarkService,
    private bookPatchService: BookPatchService
  ) {
  }

  ngOnInit() {
    this.initializeFoliate().pipe(
      switchMap(() => this.setupView()),
      switchMap(() => this.loadBookFromAPI()),
      tap(() => {
        this.loadBookmarks();
        this.subscribeToStateChanges();
        this.subscribeToViewEvents();
      }),
      catchError(err => {
        console.error(err);
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
            console.log('detail', detail);
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
              this.bookmarkService.updateCurrentPosition(cfi, chapterLabel);
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

  onChapterClick(href: string) {
    this.viewManager.goTo(href).pipe(
      tap(() => this.showChapters = false),
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.viewManager.destroy();
    this.bookmarkService.reset();
    if (this._fileUrl) {
      URL.revokeObjectURL(this._fileUrl);
      this._fileUrl = null;
    }
  }
}
