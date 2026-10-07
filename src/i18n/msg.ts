/**
 * Marks an English interface string for translation where no hook is
 * available (constants, taxonomy tables). It returns the text unchanged; the
 * text is translated where it is rendered, with `t(value)`.
 */
export const msg = (text: string): string => text;
