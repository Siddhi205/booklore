import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {ReaderStateService} from './services/reader-state.service';
import {FoliateViewManagerService} from './services/foliate-view-manager.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent {
  @Input() stateService!: ReaderStateService;
  @Input() viewManager!: FoliateViewManagerService;

  @Output() close = new EventEmitter<void>();

  activeTab: 'theme' | 'typography' | 'layout' = 'theme';

  get state() {
    return this.stateService.currentState;
  }

  get themes() {
    return this.stateService.themes;
  }

  get fonts() {
    return this.stateService.fonts;
  }

  prevPage() {
    this.viewManager.prevPage();
  }

  nextPage() {
    this.viewManager.nextPage();
  }

  setFontFamily(value: string) {
    this.stateService.setFontFamily(value);
  }

  increaseFontSize() {
    this.stateService.updateFontSize(1);
  }

  decreaseFontSize() {
    this.stateService.updateFontSize(-1);
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
    const delta = value - this.state.gap;
    this.stateService.updateGap(delta);
  }

  toggleJustify() {
    this.stateService.toggleJustify();
  }

  toggleHyphenate() {
    this.stateService.toggleHyphenate();
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

  toggleDarkMode() {
    this.stateService.toggleDarkMode();
  }

  onThemeChange(themeName: string) {
    this.stateService.setThemeByName(themeName);
  }
}
