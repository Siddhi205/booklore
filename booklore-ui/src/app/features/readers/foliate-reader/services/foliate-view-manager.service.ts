import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

export interface ViewEvent {
  type: 'load' | 'relocate' | 'error';
  detail?: any;
}

export interface BookMetadata {
  title?: string;
  authors?: string[];
  language?: string;
  publisher?: string;
  description?: string;
  identifier?: string;
  coverUrl?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class FoliateViewManagerService {
  private view: any;
  private eventSubject = new Subject<ViewEvent>();
  private keydownHandler?: (event: KeyboardEvent) => void;

  public events$ = this.eventSubject.asObservable();

  createView(container: HTMLElement): void {
    this.view = document.createElement('foliate-view');
    this.view.style.width = '100%';
    this.view.style.height = '100%';
    this.view.style.display = 'block';
    container.appendChild(this.view);

    this.attachEventListeners();
    this.attachKeyboardHandler();
  }

  async loadEpub(epubPath: string): Promise<void> {
    if (!this.view) {
      throw new Error('View not created');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(epubPath);
    if (!response.ok) {
      throw new Error(`EPUB not found: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], epubPath.split('/').pop() || 'book.epub', {
      type: 'application/epub+zip'
    });

    await this.view.open(file);
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
    this.view?.remove();
    this.view = null;
  }

  async goTo(target: string | number): Promise<void> {
    if (!this.view) return;
    await this.view.goTo(target);
  }

  async goToSection(index: number): Promise<void> {
    await this.goTo(index);
  }

  async goToFraction(fraction: number): Promise<void> {
    if (!this.view) return;
    await this.view.goToFraction(fraction);
  }

  prev(): void {
    this.view?.prev();
  }

  next(): void {
    this.view?.next();
  }

  getRenderer(): any {
    return this.view?.renderer;
  }

  getChapters(): { label: string; href: string }[] {
    if (!this.view?.book?.toc) return [];
    const flattenToc = (items: any[], result: any[] = []): any[] => {
      for (const item of items) {
        result.push(item);
        if (item.subitems?.length) {
          flattenToc(item.subitems, result);
        }
      }
      return result;
    };

    const flattened = flattenToc(this.view.book.toc);

    return flattened.map(item => ({
      label: item.label,
      href: item.href
    }));
  }

  async getMetadata(): Promise<BookMetadata> {
    if (!this.view?.book?.metadata) return {};
    const {metadata} = this.view.book;

    const coverUrl = await this.getCoverUrl();

    return {
      title: metadata.title,
      authors: metadata.authors,
      language: metadata.language,
      publisher: metadata.publisher,
      description: metadata.description,
      identifier: metadata.identifier,
      coverUrl,
      ...metadata
    };
  }

  async getCover(): Promise<Blob | null> {
    if (!this.view?.book?.getCover) return null;
    return await this.view.book.getCover();
  }

  async getCoverUrl(): Promise<string | null> {
    const blob = await this.getCover();
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  private attachEventListeners(): void {
    this.view.addEventListener('load', (e: any) => {
      this.eventSubject.next({type: 'load', detail: e.detail});
      if (e.detail?.doc && this.keydownHandler) {
        e.detail.doc.addEventListener('keydown', this.keydownHandler);
      }
    });

    this.view.addEventListener('relocate', (e: any) => {
      this.eventSubject.next({type: 'relocate', detail: e.detail});
    });

    this.view.addEventListener('error', (e: any) => {
      this.eventSubject.next({type: 'error', detail: e.detail});
    });
  }

  private attachKeyboardHandler(): void {
    this.keydownHandler = (event: KeyboardEvent) => {
      const k = event.key;
      if (k === 'ArrowLeft' || k === 'h' || k === 'PageUp') {
        this.prev();
        event.preventDefault();
      } else if (k === 'ArrowRight' || k === 'l' || k === 'PageDown') {
        this.next();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }
}
