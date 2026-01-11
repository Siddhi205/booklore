import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Subject, takeUntil} from 'rxjs';
import {FoliateLoaderService} from './services/foliate-loader.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';
import {Theme, themes} from './services/reader-themes';
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
    ReaderStyleService
  ],
  templateUrl: './foliate-reader.component.html',
  styleUrls: ['./foliate-reader.component.scss']
})
export class FoliateReaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasLoadedOnce = false;

  // For touch navigation
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  themes = themes;
  fonts = [
    {name: 'Serif', value: 'serif'},
    {name: 'Sans-Serif', value: 'sans-serif'},
    {name: 'Monospace', value: 'monospace'},
    {name: 'Cursive', value: 'cursive'},
  ];

  isDarkMode = false;
  showControls = false;
  showChapters = false;
  chapters: { label: string; href: string }[] = [];

  currentChapterName: string | null = null;

  // Add fields for book metadata
  bookCoverUrl: string | null = null;
  bookTitle: string = '';
  bookAuthors: string = '';

  get lineHeight() {
    return this.stateService.currentState.lineHeight;
  }

  get justify() {
    return this.stateService.currentState.justify;
  }

  get hyphenate() {
    return this.stateService.currentState.hyphenate;
  }

  get maxColumnCount() {
    return this.stateService.currentState.maxColumnCount;
  }

  get gap() {
    return this.stateService.currentState.gap;
  }

  get fontSize() {
    return this.stateService.currentState.fontSize;
  }

  get fontFamily() {
    return this.stateService.currentState.fontFamily;
  }

  get currentTheme() {
    return this.stateService.currentState.theme;
  }

  constructor(
    private loaderService: FoliateLoaderService,
    private viewManager: FoliateViewManagerService,
    private stateService: ReaderStateService,
    private styleService: ReaderStyleService
  ) {
  }

  async ngOnInit() {
    try {
      await this.initializeFoliate();
      await this.setupView();
      await this.loadBook();
      this.subscribeToStateChanges();
      this.subscribeToViewEvents();
      this.addNavigationListeners();
    } catch (err) {
      // Error handling
    }
  }

  private addNavigationListeners() {
    // Keyboard navigation
    document.addEventListener('keydown', this.onKeyDown);

    // Wait a bit for the DOM to be ready
    setTimeout(() => {
      const overlay = document.getElementById('navigation-overlay');
      if (overlay) {
        // Make overlay not block pointer events by default
        overlay.style.pointerEvents = 'none';

        // Attach to the container instead for better interaction
        const container = document.getElementById('foliate-container');
        if (container) {
          container.addEventListener('click', this.onContainerClick);
          container.addEventListener('touchstart', this.onTouchStart, { passive: true });
          container.addEventListener('touchend', this.onTouchEnd, { passive: false });
        }
      }
    }, 100);
  }

  private removeNavigationListeners() {
    document.removeEventListener('keydown', this.onKeyDown);

    const container = document.getElementById('foliate-container');
    if (container) {
      container.removeEventListener('click', this.onContainerClick);
      container.removeEventListener('touchstart', this.onTouchStart);
      container.removeEventListener('touchend', this.onTouchEnd);
    }
  }

  // Arrow key navigation
  private onKeyDown = (event: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'Left') {
      this.prevPage();
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'Right') {
      this.nextPage();
      event.preventDefault();
    }
  };

  // Tap/click navigation
  private onContainerClick = (event: MouseEvent) => {
    // Check if clicking on actual text or interactive elements
    const target = event.target as HTMLElement;

    // Don't navigate if clicking on links or if text is selected
    if (target.tagName === 'A' || window.getSelection()?.toString()) {
      return;
    }

    const container = event.currentTarget as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.4) {
      this.prevPage();
    } else if (x > width * 0.6) {
      this.nextPage();
    }
  };

  // Touch navigation
  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  };

  private onTouchEnd = (event: TouchEvent) => {
    if (event.changedTouches.length === 1 && this.touchStartX !== null && this.touchStartY !== null) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;

      const deltaX = Math.abs(touchEndX - this.touchStartX);
      const deltaY = Math.abs(touchEndY - this.touchStartY);

      // Only trigger if it's a tap (minimal movement)
      if (deltaX < 10 && deltaY < 10) {
        const container = event.currentTarget as HTMLElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = touchEndX - rect.left;
        const width = rect.width;

        if (x < width * 0.4) {
          this.prevPage();
          event.preventDefault();
        } else if (x > width * 0.6) {
          this.nextPage();
          event.preventDefault();
        }
      }
    }
    this.touchStartX = null;
    this.touchStartY = null;
  };

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
            // Removed: goToStart() here
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

  prevPage() {
    if (this.viewManager) {
      this.viewManager.prevPage();
    }
  }

  nextPage() {
    if (this.viewManager) {
      this.viewManager.nextPage();
    }
  }

  async onChapterClick(href: string) {
    console.log('Navigating to chapter:', href);
    await this.viewManager.goTo(href);
    this.showChapters = false;
  }

  increaseLineHeight() {
    this.stateService.updateLineHeight(0.1);
  }

  decreaseLineHeight() {
    this.stateService.updateLineHeight(-0.1);
  }

  increaseMaxColumnCount() {
    this.stateService.updateMaxColumnCount(1);
  }

  decreaseMaxColumnCount() {
    this.stateService.updateMaxColumnCount(-1);
  }

  setGap(value: number) {
    const currentGap = this.stateService.currentState.gap;
    const delta = value - currentGap;
    this.stateService.updateGap(delta);
  }

  toggleJustify() {
    this.stateService.toggleJustify();
  }

  toggleHyphenate() {
    this.stateService.toggleHyphenate();
  }

  toggleLightDark() {
    const currentTheme = this.stateService.currentState.theme;
    const isCurrentlyDark = this.isDarkMode;

    const newTheme: Theme = {
      ...currentTheme,
      fg: !isCurrentlyDark ? currentTheme.dark.fg : currentTheme.light.fg,
      bg: !isCurrentlyDark ? currentTheme.dark.bg : currentTheme.light.bg,
      link: !isCurrentlyDark ? currentTheme.dark.link : currentTheme.light.link,
    };

    this.stateService.setTheme(newTheme);
    this.isDarkMode = !isCurrentlyDark;
  }

  increaseFontSize() {
    this.stateService.updateFontSize(1);
  }

  decreaseFontSize() {
    this.stateService.updateFontSize(-1);
  }

  onFontFamilyChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target?.value) {
      this.stateService.setFontFamily(target.value);
    }
  }

  onThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target?.value) {
      this.setTheme(target.value);
    }
  }

  setTheme(themeName: string) {
    const theme = this.themes.find(t => t.name === themeName);
    if (theme) {
      const useDark = this.isDarkMode;
      const newTheme: Theme = {
        ...theme,
        fg: useDark ? theme.dark.fg : theme.light.fg,
        bg: useDark ? theme.dark.bg : theme.light.bg,
        link: useDark ? theme.dark.link : theme.light.link,
      };
      this.stateService.setTheme(newTheme);
    }
  }

  get maxInlineSize() {
    return this.stateService.currentState.maxInlineSize;
  }

  get maxBlockSize() {
    return this.stateService.currentState.maxBlockSize;
  }

  increaseMaxInlineSize() {
    this.stateService.updateMaxInlineSize(40);
  }

  decreaseMaxInlineSize() {
    this.stateService.updateMaxInlineSize(-40);
  }

  increaseMaxBlockSize() {
    this.stateService.updateMaxBlockSize(60);
  }

  decreaseMaxBlockSize() {
    this.stateService.updateMaxBlockSize(-60);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.viewManager.destroy();
    this.removeNavigationListeners();
  }
}
