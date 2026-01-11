import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-chapters-dialog',
  standalone: true,
  templateUrl: './chapters-dialog.component.html',
  styleUrls: ['./chapters-dialog.component.scss']
})
export class ChaptersDialogComponent {
  @Input() bookCoverUrl: string | null = null;
  @Input() bookTitle: string = '';
  @Input() bookAuthors: string = '';
  @Input() chapters: { label: string; href: string }[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() chapterClick = new EventEmitter<string>();

  onChapterClick(href: string) {
    this.chapterClick.emit(href);
  }
}

