import {Injectable} from '@angular/core';
import {ReaderState} from './reader-state.service';

@Injectable({
  providedIn: 'root'
})
export class ReaderStyleService {

  generateCSS(state: ReaderState): string {
    const {lineHeight, justify, hyphenate, fontSize} = state;

    return `
      @namespace epub "http://www.idpf.org/2007/ops";

      html {
        line-height: ${lineHeight};
        font-size: ${fontSize}px;
      }

      body {
        font-size: ${fontSize}px;
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

  applyStylesToRenderer(renderer: any, state: ReaderState): void {
    if (!renderer) {
      return;
    }

    renderer.setAttribute('max-column-count', state.maxColumnCount);
    renderer.setAttribute('gap', `${state.gap * 100}%`);

    if (typeof renderer.setStyles === 'function') {
      const css = this.generateCSS(state);
      renderer.setStyles(css);
    } else {
      console.warn('Renderer.setStyles not available');
    }
  }
}
