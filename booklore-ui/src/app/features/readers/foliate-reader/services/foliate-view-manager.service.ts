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
  public events$ = this.eventSubject.asObservable();

  createView(container: HTMLElement): void {
    this.view = document.createElement('foliate-view');
    this.view.style.width = '100%';
    this.view.style.height = '100%';
    this.view.style.display = 'block';
    container.appendChild(this.view);

    this.attachEventListeners();
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

  getRenderer(): any {
    return this.view?.renderer;
  }

  /** Navigate to a specific location (CFI, href, or index) */
  async goTo(target: string | number): Promise<void> {
    if (!this.view) return;
    await this.view.goTo(target);
  }

  /** Navigate to previous page */
  prev(): void {
    this.view?.prev();
  }

  /** Navigate to next page */
  next(): void {
    this.view?.next();
  }

  destroy(): void {
    this.view?.remove();
    this.view = null;
  }

  private attachEventListeners(): void {
    this.view.addEventListener('load', () => {
      this.eventSubject.next({type: 'load'});
    });

    this.view.addEventListener('relocate', (e: any) => {
      this.eventSubject.next({type: 'relocate', detail: e.detail});
    });

    this.view.addEventListener('error', (e: any) => {
      this.eventSubject.next({type: 'error', detail: e.detail});
    });
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

  /** Returns basic metadata about the loaded book */
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

  /** Returns the book title */
  getTitle(): string {
    return this.view?.book?.metadata?.title ?? '';
  }

  /** Returns the book authors as an array of strings */
  getAuthors(): string[] {
    return this.view?.book?.metadata?.authors ?? [];
  }

  /** Returns the book language */
  getLanguage(): string {
    return this.view?.book?.metadata?.language ?? '';
  }

  /** Returns the cover as a Blob */
  async getCover(): Promise<Blob | null> {
    if (!this.view?.book?.getCover) return null;
    return await this.view.book.getCover();
  }

  /** Returns a URL that can be used in <img src="..."> for the cover */
  async getCoverUrl(): Promise<string | null> {
    const blob = await this.getCover();
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
}
