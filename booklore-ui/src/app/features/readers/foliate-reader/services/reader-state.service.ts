import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Theme, themes} from './reader-themes';

export interface ReaderState {
  lineHeight: number;
  justify: boolean;
  hyphenate: boolean;
  maxColumnCount: number;
  gap: number;
  fontSize: number; // in pixels
  theme: Theme;
  maxInlineSize: number;
  maxBlockSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReaderStateService {
  private readonly initialState: ReaderState = {
    lineHeight: 1.5,
    justify: false,
    hyphenate: true,
    maxColumnCount: 2,
    gap: 0.05,
    fontSize: 16,
    theme: {
      ...themes[0],
      fg: themes[0].light.fg,
      bg: themes[0].light.bg,
      link: themes[0].light.link,
    }, // Set light theme as default with correct variant
    maxInlineSize: 720,
    maxBlockSize: 1440,
  };

  private stateSubject = new BehaviorSubject<ReaderState>(this.initialState);
  public state$ = this.stateSubject.asObservable();

  get currentState(): ReaderState {
    return this.stateSubject.value;
  }

  updateLineHeight(delta: number): void {
    const current = this.currentState.lineHeight;
    const newValue = Math.max(0.8, Math.min(3, current + delta));
    this.updateState({lineHeight: newValue});
  }

  updateMaxColumnCount(delta: number): void {
    const current = this.currentState.maxColumnCount;
    const newValue = Math.max(1, Math.min(10, current + delta));
    this.updateState({maxColumnCount: newValue});
  }

  updateGap(delta: number): void {
    const current = this.currentState.gap;
    const newValue = Math.max(0, Math.min(0.5, current + delta));
    this.updateState({gap: newValue});
  }

  toggleJustify(): void {
    this.updateState({justify: !this.currentState.justify});
  }

  toggleHyphenate(): void {
    this.updateState({hyphenate: !this.currentState.hyphenate});
  }

  setJustify(justify: boolean): void {
    this.updateState({justify});
  }

  updateFontSize(delta: number): void {
    const newFontSize = Math.max(10, Math.min(32, this.currentState.fontSize + delta));
    this.updateState({fontSize: newFontSize});
  }

  setTheme(theme: Theme): void {
    this.updateState({theme});
  }

  updateMaxInlineSize(delta: number): void {
    const newValue = Math.max(400, Math.min(1600, this.currentState.maxInlineSize + delta));
    this.updateState({maxInlineSize: newValue});
  }

  updateMaxBlockSize(delta: number): void {
    const newValue = Math.max(600, Math.min(2400, this.currentState.maxBlockSize + delta));
    this.updateState({maxBlockSize: newValue});
  }

  private updateState(partial: Partial<ReaderState>): void {
    this.stateSubject.next({...this.currentState, ...partial});
  }
}
