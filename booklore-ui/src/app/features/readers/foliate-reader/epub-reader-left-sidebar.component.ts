import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BookMark} from '../../../shared/service/book-mark.service';

@Component({
  selector: 'epub-reader-left-sidebar',
  standalone: true,
  templateUrl: './epub-reader-left-sidebar.component.html',
  styleUrls: ['./epub-reader-left-sidebar.component.scss'],
  imports: [CommonModule]
})
export class EpubReaderLeftSidebarComponent {
  @Input() bookCoverUrl: string | null = null;
  @Input() bookTitle: string = '';
  @Input() bookAuthors: string = '';
  @Input() chapters: { label: string; href: string }[] = [];
  @Input() bookmarks: BookMark[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() chapterClick = new EventEmitter<string>();
  @Output() bookmarkClick = new EventEmitter<string>();
  @Output() deleteBookmark = new EventEmitter<number>();

  activeTab: 'chapters' | 'bookmarks' | 'annotation' = 'chapters';

  onChapterClick(href: string) {
    this.chapterClick.emit(href);
  }

  onBookmarkClick(cfi: string) {
    this.bookmarkClick.emit(cfi);
  }

  onDeleteBookmark(event: MouseEvent, bookmarkId: number) {
    event.stopPropagation();
    this.deleteBookmark.emit(bookmarkId);
  }
}
