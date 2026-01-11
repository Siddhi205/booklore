import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Subject, takeUntil} from 'rxjs';
import {FoliateLoaderService} from './services/foliate-loader.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';
import {Theme, themes} from './services/reader-themes';

@Component({
  selector: 'app-foliate-reader',
  standalone: true,
  imports: [CommonModule],
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

  themes = themes;

  isDarkMode = false; // UI state for toggle

  showControls = false; // Add this property for dialog visibility

  get lineHeight() {
    return this.stateService.currentState.lineHeight;
  }

  get justify() {
    return this.stateService.currentState.justify;
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

  get currentTheme() {
    return this.stateService.currentState.theme;
  }

  get isThemeDark() {
    // Detect if current theme is dark by comparing fg/bg to dark variant
    const theme = this.currentTheme;
    return (
      theme &&
      theme.dark &&
      theme.fg === theme.dark.fg &&
      theme.bg === theme.dark.bg
    );
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
    } catch (err) {
      // Error handling
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
        console.log(event);
        switch (event.type) {
          case 'relocate':
            break;
          case 'error':
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
    this.viewManager.prevPage();
  }

  nextPage() {
    this.viewManager.nextPage();
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

  increaseGap() {
    this.stateService.updateGap(0.01);
  }

  decreaseGap() {
    this.stateService.updateGap(-0.01);
  }

  setGap(value: number) {
    const currentGap = this.stateService.currentState.gap;
    const delta = value - currentGap;
    this.stateService.updateGap(delta);
  }

  toggleJustify() {
    this.stateService.toggleJustify();
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.viewManager.destroy();
  }
}
