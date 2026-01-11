import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Subject, takeUntil} from 'rxjs';
import {FoliateLoaderService} from './services/foliate-loader.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';
import {ReaderStateService} from './services/reader-state.service';
import {ReaderStyleService} from './services/reader-style.service';

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

  debugInfo = '';

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
      this.updateDebug(`ERROR: ${err}`);
    }
  }

  private async initializeFoliate(): Promise<void> {
    this.updateDebug('Initializing Foliate...');
    await this.loaderService.loadFoliateScript();
    this.updateDebug('Foliate script loaded');

    await this.loaderService.waitForCustomElement();
    this.updateDebug('Custom element defined');
  }

  private async setupView(): Promise<void> {
    const container = document.getElementById('foliate-container');
    if (!container) {
      throw new Error('Container not found');
    }

    this.viewManager.createView(container);
  }

  private async loadBook(): Promise<void> {
    this.updateDebug('Fetching EPUB...');
    await this.viewManager.loadEpub('/assets/fuck.epub');
    this.updateDebug('EPUB opened successfully');
    this.applyStyles();
  }

  private subscribeToStateChanges(): void {
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyStyles());
  }

  private subscribeToViewEvents(): void {
    this.viewManager.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        switch (event.type) {
          case 'load':
            this.applyStyles();
            break;
          case 'relocate':
            this.updateDebug(`📍 Location: ${JSON.stringify(event.detail)}`);
            break;
          case 'error':
            this.updateDebug(`❌ Error: ${JSON.stringify(event.detail)}`);
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

  private updateDebug(message: string): void {
    this.debugInfo = message;
    console.log(message);
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

  setJustify(justify: boolean) {
    this.stateService.setJustify(justify);
  }

  increaseFontSize() {
    this.stateService.updateFontSize(1);
  }

  decreaseFontSize() {
    this.stateService.updateFontSize(-1);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.viewManager.destroy();
  }
}
