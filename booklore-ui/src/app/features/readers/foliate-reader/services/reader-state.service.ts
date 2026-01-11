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
  fontFamily: string;
  isDark: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReaderStateService {
  private readonly initialState: ReaderState = {
    lineHeight: 1.5,
    justify: true,
    hyphenate: true,
    maxColumnCount: 2,
    gap: 0.05,
    fontSize: 16,
    theme: {
      ...themes[0],
      fg: themes[0].dark.fg,
      bg: themes[0].dark.bg,
      link: themes[0].dark.link,
    },
    maxInlineSize: 720,
    maxBlockSize: 1440,
    fontFamily: 'serif',
    isDark: true,
  };

  private stateSubject = new BehaviorSubject<ReaderState>(this.initialState);
  public state$ = this.stateSubject.asObservable();

  get currentState(): ReaderState {
    return this.stateSubject.value;
  }

  readonly themes = themes;
  readonly fonts = [
    {name: 'Serif', value: 'serif'},
    {name: 'Sans-Serif', value: 'sans-serif'},
    {name: 'Monospace', value: 'monospace'},
    {name: 'Cursive', value: 'cursive'},
  ];

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

  setFontFamily(font: string): void {
    this.updateState({fontFamily: font});
  }

  updateMaxInlineSize(delta: number): void {
    const newValue = Math.max(400, Math.min(1600, this.currentState.maxInlineSize + delta));
    this.updateState({maxInlineSize: newValue});
  }

  updateMaxBlockSize(delta: number): void {
    const newValue = Math.max(600, Math.min(2400, this.currentState.maxBlockSize + delta));
    this.updateState({maxBlockSize: newValue});
  }

  toggleDarkMode() {
    const currentTheme = this.currentState.theme;
    const newIsDark = !this.currentState.isDark;

    const newTheme = {
      ...currentTheme,
      fg: newIsDark ? currentTheme.dark.fg : currentTheme.light.fg,
      bg: newIsDark ? currentTheme.dark.bg : currentTheme.light.bg,
      link: newIsDark ? currentTheme.dark.link : currentTheme.light.link,
    };

    this.updateState({theme: newTheme, isDark: newIsDark});
  }

  setThemeByName(themeName: string) {
    const theme = this.themes.find(t => t.name === themeName);
    if (theme) {
      const newTheme = {
        ...theme,
        fg: this.currentState.isDark ? theme.dark.fg : theme.light.fg,
        bg: this.currentState.isDark ? theme.dark.bg : theme.light.bg,
        link: this.currentState.isDark ? theme.dark.link : theme.light.link,
      };
      this.setTheme(newTheme);
    }
  }

  private updateState(partial: Partial<ReaderState>): void {
    this.stateSubject.next({...this.currentState, ...partial});
  }
}
