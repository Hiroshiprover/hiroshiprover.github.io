import type {Options} from 'rehype-katex';

// The KaTeX macro-function API exposes token consumption through its expander.
// Keep this small adapter local: no imports from KaTeX's internal modules.
type MacroToken = {text: string};
type MacroContext = {
  consumeArgs: (count: number) => MacroToken[][];
  consumeSpaces: () => void;
  future: () => MacroToken;
};

function withRepeatedSecondArgument(command: string) {
  return (expander: object) => {
    const context = expander as MacroContext;
    const [first] = context.consumeArgs(1);
    context.consumeSpaces();
    const second = context.future().text === '{'
      ? context.consumeArgs(1)[0]
      : first;

    // KaTeX stores expansion tokens in reverse order. Preserve argument tokens
    // rather than rebuilding TeX strings, including nested commands and groups.
    return {
      tokens: [
        {text: '}'}, ...second, {text: '{'},
        {text: '}'}, ...first, {text: '{'},
        {text: command},
      ],
      numArgs: 0,
    };
  };
}

// Shared by docs, project notes, blog and MDX pages in every locale.
export const katexOptions: Options = {
  macros: {
    '\\bra': '\\left\\langle #1 \\right|',
    '\\ket': '\\left| #1 \\right\\rangle',
    '\\braket': withRepeatedSecondArgument('\\site@braket'),
    '\\site@braket': '\\left\\langle #1 \\middle| #2 \\right\\rangle',
    '\\ketbra': withRepeatedSecondArgument('\\site@ketbra'),
    '\\site@ketbra': '\\left| #1 \\right\\rangle\\!\\left\\langle #2 \\right|',
    '\\abs': '\\left| #1 \\right|',
    '\\norm': '\\left\\lVert #1 \\right\\rVert',
    '\\dd': '\\mathop{}\\!\\mathrm{d}',
    '\\ii': '\\mathrm{i}',
    '\\C': '\\mathbb{C}',
    '\\F': '\\mathbb{F}',
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
  },
};
