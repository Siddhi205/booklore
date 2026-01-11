import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DecimalPipe} from '@angular/common';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent {
  @Input() themes: any[] = [];
  @Input() fonts: any[] = [];
  @Input() isDarkMode: boolean = false;
  @Input() fontFamily!: string;
  @Input() fontSize!: number;
  @Input() lineHeight!: number;
  @Input() maxColumnCount!: number;
  @Input() gap!: number;
  @Input() justify!: boolean;
  @Input() hyphenate!: boolean;
  @Input() currentTheme: any;
  @Input() maxInlineSize!: number;
  @Input() maxBlockSize!: number;

  @Output() close = new EventEmitter<void>();
  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() onFontFamilyChange = new EventEmitter<Event>();
  @Output() increaseFontSize = new EventEmitter<void>();
  @Output() decreaseFontSize = new EventEmitter<void>();
  @Output() increaseLineHeight = new EventEmitter<void>();
  @Output() decreaseLineHeight = new EventEmitter<void>();
  @Output() increaseMaxColumnCount = new EventEmitter<void>();
  @Output() decreaseMaxColumnCount = new EventEmitter<void>();
  @Output() setGap = new EventEmitter<number>();
  @Output() toggleJustify = new EventEmitter<void>();
  @Output() toggleHyphenate = new EventEmitter<void>();
  @Output() toggleLightDark = new EventEmitter<void>();
  @Output() onThemeChange = new EventEmitter<Event>();
  @Output() increaseMaxInlineSize = new EventEmitter<void>();
  @Output() decreaseMaxInlineSize = new EventEmitter<void>();
  @Output() increaseMaxBlockSize = new EventEmitter<void>();
  @Output() decreaseMaxBlockSize = new EventEmitter<void>();
}
