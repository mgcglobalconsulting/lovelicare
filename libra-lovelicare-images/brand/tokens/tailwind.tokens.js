/**
 * LoveLi Care Med Spa — Tailwind theme fragment
 * Palette: Vagaro "Bare" — warm monochrome nude
 *
 * Usage (tailwind.config.js):
 *   const loveliCare = require('./brand/tokens/tailwind.tokens.js');
 *   module.exports = { theme: { extend: loveliCare } };
 */

module.exports = {
  colors: {
    // ---- Core five (Vagaro "Bare") ----
    espresso: '#3C2B25', // darkest ground, primary dark, buttons
    cacao:    '#6E564E', // secondary dark, accent text on light
    greige:   '#BDAEA9', // hairlines; muted text ON DARK ONLY
    shell:    '#E9DAD1', // secondary light ground, body on dark
    bone:     '#F4F1EB', // primary light ground

    // ---- Extensions (derived in-family) ----
    ink:  '#241915', // max-contrast headings, full-bleed dark
    sand: '#EADFD5', // page field behind cards
    clay: '#A8938B', // secondary buttons, icon strokes — NEVER text
    mist: '#FAF8F5', // card surfaces, inputs

    // ---- Optional heritage accent: <=3% of screen, metallic only ----
    gold:    '#C9A96E', // DECORATIVE ONLY — fails as text on light (2.0:1)
    goldInk: '#7A5F33', // the only accessible gold for text on light (5.7:1)

    // ---- Alerts: desaturated into the warm family ----
    success:     '#6B7A5E',
    successDark: '#9DAE8C',
    warn:        '#A8742E',
    warnDark:    '#D9A961',
    error:       '#9E4B42',
    errorDark:   '#D98C84',
  },

  fontFamily: {
    display:   ['Marcellus', 'Cormorant Garamond', 'Georgia', 'serif'],
    editorial: ['Cormorant Garamond', 'Georgia', 'serif'],
    sans:      ['Jost', 'system-ui', '-apple-system', 'sans-serif'],
  },

  // base 17px, ratio 1.25 (major third)
  fontSize: {
    '2xs':  ['0.6875rem', { lineHeight: '1.4',  letterSpacing: '0.16em' }], // 11 — overline/credential
    xs:     ['0.8125rem', { lineHeight: '1.5',  letterSpacing: '0.04em' }], // 13
    sm:     ['0.9375rem', { lineHeight: '1.6'  }],                          // 15
    base:   ['1.0625rem', { lineHeight: '1.65' }],                          // 17 — body
    lg:     ['1.3125rem', { lineHeight: '1.55' }],                          // 21
    xl:     ['1.6875rem', { lineHeight: '1.4',  letterSpacing: '-0.01em' }], // 27
    '2xl':  ['2.0625rem', { lineHeight: '1.3',  letterSpacing: '-0.01em' }], // 33
    '3xl':  ['2.625rem',  { lineHeight: '1.2',  letterSpacing: '-0.015em' }],// 42
    '4xl':  ['3.25rem',   { lineHeight: '1.12', letterSpacing: '-0.02em' }], // 52
    '5xl':  ['4.0625rem', { lineHeight: '1.08', letterSpacing: '-0.02em' }], // 65
    '6xl':  ['5.0625rem', { lineHeight: '1.04', letterSpacing: '-0.025em' }],// 81
    hero:      ['clamp(2.5rem, 1.4rem + 5.2vw, 4.0625rem)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
    statement: ['clamp(2rem, 1.1rem + 4.4vw, 5.0625rem)',   { lineHeight: '1.04', letterSpacing: '-0.025em' }],
    h2:        ['clamp(1.75rem, 1.2rem + 2.4vw, 2.625rem)', { lineHeight: '1.2',  letterSpacing: '-0.015em' }],
  },

  letterSpacing: { caps: '0.16em' },

  spacing: {
    1: '0.25rem', 2: '0.5rem',  3: '0.75rem', 4: '1rem',
    5: '1.5rem',  6: '2rem',    7: '3rem',    8: '4rem',
    9: '6rem',   10: '8rem',   11: '10rem',  12: '14rem',
    section:   'clamp(5rem, 11vh, 10rem)',
    sectionLg: 'clamp(7rem, 16vh, 14rem)',
    gutter:    'clamp(1.5rem, 4vw, 2.5rem)',
  },

  maxWidth: {
    container: '1280px',
    narrow:    '760px',
    measure:   '34em', // ~68 characters
  },

  borderRadius: {
    sm: '6px', md: '12px', lg: '20px', pill: '999px',
    arch: '20rem 20rem 0 0', // SIGNATURE: villa archway niche
  },

  // Pool-surface model: warm brown at low opacity, NEVER neutral black.
  // Black shadow on a nude palette reads as dirt.
  boxShadow: {
    e2: 'inset 0 1px 0 rgba(255,255,255,0.55)',
    e3: '0 24px 64px -24px rgba(60,43,37,0.22), 0 0 48px -16px rgba(110,86,78,0.10)',
    e2Dark: 'inset 0 1px 0 rgba(255,255,255,0.09)',
    e3Dark: '0 24px 64px -24px rgba(0,0,0,0.55), 0 0 48px -16px rgba(233,218,209,0.08)',
  },

  backdropBlur: { e1: '20px', e2: '28px' },

  // Derived from the 122 BPM source genre. 1 beat = 492ms -> 480ms base.
  transitionDuration: {
    quick:    '240ms',  // 1/2 beat — hover, focus
    base:     '480ms',  // 1 beat — default transition, reveal
    slow:     '720ms',  // 1.5 beats — panel expand
    dissolve: '1200ms', // ~2.5 beats — hero crossfade
    ambient:  '16000ms',// 8-bar phrase — background loop
  },

  transitionTimingFunction: {
    tide:    'cubic-bezier(0.22, 1, 0.36, 1)', // default — long decel, things settle
    swell:   'cubic-bezier(0.65, 0, 0.35, 1)', // loops, ambient
    surface: 'cubic-bezier(0.33, 1, 0.68, 1)', // hovers
  },

  // ENVIRONMENTS ONLY. Never on a button, text fill, card, icon or blob.
  backgroundImage: {
    horizon: 'linear-gradient(170deg, #241915 0%, #3C2B25 38%, #6E564E 68%, #BDAEA9 88%, #E9DAD1 100%)',
    dusk:    'linear-gradient(180deg, #241915 0%, #3C2B25 55%, #6E564E 100%)',
    plaster: 'linear-gradient(165deg, #FAF8F5 0%, #F4F1EB 45%, #EADFD5 100%)',
    sunwash: 'linear-gradient(200deg, #F4F1EB 0%, #EADFD5 52%, #E9DAD1 100%)',
  },

  gridTemplateColumns: {
    // Villa variant: asymmetry reads as architecture; 6/6 reads as template.
    '7-5': '7fr 5fr',
    '5-7': '5fr 7fr',
  },
};
