import {Injectable} from '@angular/core';
import {ReaderState} from './reader-state.service';

@Injectable({
  providedIn: 'root'
})
export class ReaderStyleService {

  generateCSS(state: ReaderState): string {
    const {
      lineHeight, justify, hyphenate, fontSize, theme
    } = state;
    const userStylesheet = ''; // Placeholder for user styles
    const overrideFont = false; // Placeholder
    const mediaActiveClass = 'media-active'; // Placeholder

    const css = `
    @namespace epub "http://www.idpf.org/2007/ops";
    @media print {
        html {
            column-width: auto !important;
            height: auto !important;
            width: auto !important;
        }
    }
    @media screen {
        html {
            color-scheme: light dark;
            color: ${theme.fg || theme.light.fg};
            font-size: ${fontSize}px;
        }
        a:any-link {
            color: ${theme.link || theme.light.link};
            text-decoration-color: light-dark(
                color-mix(in srgb, currentColor 20%, transparent),
                color-mix(in srgb, currentColor 40%, transparent));
            text-underline-offset: .1em;
        }
        a:any-link:hover {
            text-decoration-color: unset;
        }
        @media (prefers-color-scheme: dark) {
            html {
                color: ${theme.fg || theme.dark.fg};
            }
            a:any-link {
                color: ${theme.link || theme.dark.link};
            }
        }
        aside[epub|type~="footnote"] {
            display: none;
        }
    }
    html {
        line-height: ${lineHeight};
        hanging-punctuation: allow-end last;
        orphans: 2;
        widows: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }
    :is(hgroup, header) p {
        text-align: unset;
        hyphens: unset;
    }
    h1, h2, h3, h4, h5, h6, hgroup, th {
        text-wrap: balance;
    }
    pre {
        white-space: pre-wrap !important;
        tab-size: 2;
    }
    @media screen and (prefers-color-scheme: light) {
        ${(theme.bg || theme.light.bg) !== '#ffffff' ? `
        html, body {
            color: ${theme.fg || theme.light.fg} !important;
            background: none !important;
        }
        body * {
            color: inherit !important;
            border-color: currentColor !important;
            background-color: ${theme.bg || theme.light.bg} !important;
        }
        a:any-link {
            color: ${theme.link || theme.light.link} !important;
        }
        svg, img {
            background-color: transparent !important;
            mix-blend-mode: multiply;
        }
        .${mediaActiveClass}, .${mediaActiveClass} * {
            color: ${theme.fg || theme.light.fg} !important;
            background: color-mix(in hsl, ${theme.fg || theme.light.fg}, #fff 50%) !important;
            background: color-mix(in hsl, ${theme.fg || theme.light.fg}, ${theme.bg || theme.light.bg} 85%) !important;
        }` : ''}
    }
    @media screen and (prefers-color-scheme: dark) {

        html, body {
            color: ${theme.fg || theme.dark.fg} !important;
            background: none !important;
        }
        body * {
            color: inherit !important;
            border-color: currentColor !important;
            background-color: ${theme.bg || theme.dark.bg} !important;
        }
        a:any-link {
            color: ${theme.link || theme.dark.link} !important;
        }
        .${mediaActiveClass}, .${mediaActiveClass} * {
            color: ${theme.fg || theme.dark.fg} !important;
            background: color-mix(in hsl, ${theme.fg || theme.dark.fg}, #000 50%) !important;
            background: color-mix(in hsl, ${theme.fg || theme.dark.fg}, ${theme.bg || theme.dark.bg} 75%) !important;
        }
    }
    p, li, blockquote, dd {
        line-height: ${lineHeight};
        text-align: ${justify ? 'justify' : 'start'} !important;
        hyphens: ${hyphenate ? 'auto' : 'none'};
    }
    ${overrideFont ? '* { font-family: revert !important }' : ''}
    ${userStylesheet}
    `;
    return css;
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
