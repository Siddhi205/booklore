export interface ThemeMode {
  fg: string;
  bg: string;
  link: string;
}

export interface Theme {
  name: string;
  label: string;
  light: ThemeMode;
  dark: ThemeMode;
  fg?: string;
  bg?: string;
  link?: string;
}

export const themes: Theme[] = [
  {
    name: 'grass', label: 'Grass',
    light: {fg: '#232c16', bg: '#d7dbbd', link: '#177b4d'},
    dark: {fg: '#d8deba', bg: '#333627', link: '#a6d608'},
  },
  {
    name: 'angular', label: 'Angular',
    light: {fg: '#212529', bg: '#ffffff', link: '#dd0031'},
    dark: {fg: '#dee2e6', bg: '#343a40', link: '#ff4081'},
  },
  {
    name: 'default', label: 'Default',
    light: {fg: '#000000', bg: '#ffffff', link: '#0066cc'},
    dark: {fg: '#e0e0e0', bg: '#222222', link: '#77bbee'},
  },
  {
    name: 'gray', label: 'Gray',
    light: {fg: '#222222', bg: '#e0e0e0', link: '#4488cc'},
    dark: {fg: '#c6c6c6', bg: '#444444', link: '#88ccee'},
  },
  {
    name: 'sepia', label: 'Sepia',
    light: {fg: '#5b4636', bg: '#f1e8d0', link: '#008b8b'},
    dark: {fg: '#ffd595', bg: '#342e25', link: '#48d1cc'},
  },
  {
    name: 'cherry', label: 'Cherry',
    light: {fg: '#4e1609', bg: '#f0d1d5', link: '#de3838'},
    dark: {fg: '#e5c4c8', bg: '#462f32', link: '#ff646e'},
  },
  {
    name: 'sky', label: 'Sky',
    light: {fg: '#262d48', bg: '#cedef5', link: '#2d53e5'},
    dark: {fg: '#babee1', bg: '#282e47', link: '#ff646e'},
  },
  {
    name: 'solarized', label: 'Solarized',
    light: {fg: '#586e75', bg: '#fdf6e3', link: '#268bd2'},
    dark: {fg: '#93a1a1', bg: '#002b36', link: '#268bd2'},
  },
  {
    name: 'gruvbox', label: 'Gruvbox',
    light: {fg: '#3c3836', bg: '#fbf1c7', link: '#076678'},
    dark: {fg: '#ebdbb2', bg: '#282828', link: '#83a598'},
  },
  {
    name: 'nord', label: 'Nord',
    light: {fg: '#2e3440', bg: '#eceff4', link: '#5e81ac'},
    dark: {fg: '#d8dee9', bg: '#2e3440', link: '#88c0d0'},
  },
];
