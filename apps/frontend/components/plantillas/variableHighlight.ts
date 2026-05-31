/**
 * CodeMirror 6 variable highlight plugin for plantilla editor.
 * Decorates {{...}} markers: blue for valid tipoObjeto, red underline for unknown (F-030b).
 */

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { parseVariables } from '@lexscribe/shared-validation';

/** CSS class names used in EditorView.theme and decorations. */
export const VAR_VALID_CLASS = 'cm-var-valid';
export const VAR_INVALID_CLASS = 'cm-var-invalid';

/**
 * Build decorations from the current editor document.
 * Runs parseVariables on full text and maps each VariableDetectada to a Decoration.mark.
 * Valid variables (tipoObjeto in KNOWN_TIPO_OBJETO) -> cm-var-valid (blue).
 * Invalid variables -> cm-var-invalid (red underline).
 */
export function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  const vars = parseVariables(text);

  for (const v of vars) {
    // Compute absolute offset: line(linea).from is 0-based offset of line start.
    // linea is 1-based, columna is 1-based column of {{ on that line.
    const line = view.state.doc.line(v.linea);
    const from = line.from + (v.columna - 1);
    const to = from + v.raw.length;

    if (from >= 0 && to <= view.state.doc.length) {
      builder.add(
        from,
        to,
        Decoration.mark({ class: v.valido ? VAR_VALID_CLASS : VAR_INVALID_CLASS }),
      );
    }
  }

  return builder.finish();
}

/** CM6 ViewPlugin that recomputes decorations on every doc change. */
export const highlightViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

/** EditorView.theme extension for variable highlight CSS. */
export const variableHighlightTheme = EditorView.theme({
  [`.${VAR_VALID_CLASS}`]: { color: '#2563eb' },
  [`.${VAR_INVALID_CLASS}`]: { color: '#dc2626', textDecoration: 'underline wavy' },
});
