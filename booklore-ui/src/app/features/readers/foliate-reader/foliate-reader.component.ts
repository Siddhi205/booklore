import {Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-foliate-reader',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './foliate-reader.component.html',
  styleUrls: ['./foliate-reader.component.scss']
})
export class FoliateReaderComponent implements OnInit, OnDestroy {
  private view: any;

  debugInfo = '';
  lineHeight = 1.5;
  justify = false;
  hyphenate = true;

  async ngOnInit() {
    try {
      this.updateDebug('Initializing Foliate...');

      await this.loadFoliate();
      this.updateDebug('Foliate script loaded');

      await customElements.whenDefined('foliate-view');
      this.updateDebug('Custom element defined');

      const container = document.getElementById('foliate-container');
      if (!container) throw new Error('Container not found');

      // Create the foliate view
      this.view = document.createElement('foliate-view');
      this.view.style.width = '100%';
      this.view.style.height = '100%';
      this.view.style.display = 'block';
      container.appendChild(this.view);

      // Wait a tiny bit for the element to initialize
      await new Promise(r => setTimeout(r, 100));

      // Event listeners
      this.view.addEventListener('load', () => this.applyStyles());
      this.view.addEventListener('relocate', (e: any) =>
        this.updateDebug(`📍 Location: ${JSON.stringify(e.detail)}`)
      );
      this.view.addEventListener('error', (e: any) =>
        this.updateDebug(`❌ Error: ${JSON.stringify(e.detail)}`)
      );

      // Load EPUB
      this.updateDebug('Fetching EPUB...');
      const resp = await fetch('/assets/fuck.epub');
      if (!resp.ok) throw new Error(`EPUB not found: ${resp.status}`);
      const blob = await resp.blob();
      const file = new File([blob], 'fuck.epub', {type: 'application/epub+zip'});
      this.updateDebug(`EPUB loaded: ${blob.size} bytes`);

      await this.view.open(file);
      this.updateDebug('EPUB opened successfully');

      // Initial styling
      this.applyStyles();
    } catch (err) {
      this.updateDebug(`ERROR: ${err}`);
    }
  }

  // Navigation
  prevPage() {
    this.view?.prev();
  }

  nextPage() {
    this.view?.next();
  }

  // Styling controls
  increaseLineHeight() {
    this.lineHeight = Math.min(this.lineHeight + 0.1, 3);
    this.applyStyles();
  }

  decreaseLineHeight() {
    this.lineHeight = Math.max(this.lineHeight - 0.1, 0.8);
    this.applyStyles();
  }

  toggleJustify() {
    this.justify = !this.justify;
    this.applyStyles();
  }

  toggleHyphenate() {
    this.hyphenate = !this.hyphenate;
    this.applyStyles();
  }

  // Apply CSS to the foliate renderer
  private applyStyles() {
    if (!this.view?.renderer) return;

    const css = this.getCSS({
      lineHeight: this.lineHeight,
      justify: this.justify,
      hyphenate: this.hyphenate
    });

    if (typeof this.view.renderer.setStyles === 'function') {
      this.view.renderer.setStyles(css);
    } else {
      console.warn('Renderer.setStyles not available');
    }
  }

  private getCSS(opts: { lineHeight: number; justify: boolean; hyphenate: boolean }) {
    const {lineHeight, justify, hyphenate} = opts;
    return `
      @namespace epub "http://www.idpf.org/2007/ops";

      html {
        line-height: ${lineHeight};
      }

      [align="left"] { text-align: left; }
      [align="right"] { text-align: right; }
      [align="center"] { text-align: center; }
      [align="justify"] { text-align: justify; }

      p, li, blockquote, dd {
        line-height: ${lineHeight};
        text-align: ${justify ? 'justify' : 'start'} !important;
        hyphens: ${hyphenate ? 'auto' : 'none'};
      }

      pre {
        white-space: pre-wrap !important;
      }

      aside[epub|type~="footnote"],
      aside[epub|type~="endnote"],
      aside[epub|type~="note"] {
        display: none;
      }
    `;
  }

  private updateDebug(message: string) {
    this.debugInfo = message;
    console.log(message);
  }

  private loadFoliate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (customElements.get('foliate-view')) return resolve();

      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/assets/foliate/view.js';
      script.onload = () => setTimeout(resolve, 100);
      script.onerror = () => reject(new Error('Failed to load foliate.js'));
      document.head.appendChild(script);
    });
  }

  ngOnDestroy() {
    this.view?.remove();
  }

  setJustify(justify: boolean) {
    this.justify = justify;
    this.applyStyles();
  }
}
