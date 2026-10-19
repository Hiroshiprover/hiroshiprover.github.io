import type {Options} from 'rehype-katex';

// Shared by docs, blog and standalone MDX pages in every locale.
export const katexOptions: Options = {
  macros: {
    '\\bra': '\\left\\langle #1 \\right|',
    '\\ket': '\\left| #1 \\right\\rangle',
    '\\braket': '\\left\\langle #1 \\middle| #2 \\right\\rangle',
    '\\ketbra': '\\left| #1 \\right\\rangle\\!\\left\\langle #2 \\right|',
    '\\abs': '\\left| #1 \\right|',
    '\\norm': '\\left\\lVert #1 \\right\\rVert',
    '\\C': '\\mathbb{C}',
    '\\F': '\\mathbb{F}',
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
  },
};
