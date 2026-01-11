import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-chapters-dialog',
  standalone: true,
  templateUrl: './chapters-dialog.component.html',
  styleUrls: ['./chapters-dialog.component.scss'],
  imports: [CommonModule]
})
export class ChaptersDialogComponent {
  @Input() bookCoverUrl: string | null = null;
  @Input() bookTitle: string = '';
  @Input() bookAuthors: string = '';
  @Input() chapters: { label: string; href: string }[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() chapterClick = new EventEmitter<string>();

  activeTab: 'chapters' | 'bookmarks' | 'annotation' = 'chapters';

  onChapterClick(href: string) {
    this.chapterClick.emit(href);
  }
}
