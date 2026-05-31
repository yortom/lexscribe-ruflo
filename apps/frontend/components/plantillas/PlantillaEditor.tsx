'use client';
/**
 * CodeMirror 6 plantilla editor component.
 * Highlights valid {{...}} variables in blue and unknown-type in red (F-030b, PLAN-05).
 * Exposes insertAtCursor(text) via forwardRef + useImperativeHandle (CLAU-04).
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { highlightViewPlugin, variableHighlightTheme } from './variableHighlight';

export interface PlantillaEditorHandle {
  /** Insert text at the current cursor position (used by InsertarClausulaModal). */
  insertAtCursor: (text: string) => void;
}

interface PlantillaEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export const PlantillaEditor = forwardRef<PlantillaEditorHandle, PlantillaEditorProps>(
  function PlantillaEditor({ value, onChange }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Track last synced value to avoid feedback loops
    const lastValueRef = useRef<string>(value);

    useEffect(() => {
      if (!hostRef.current) return;

      const view = new EditorView({
        state: EditorState.create({
          doc: value,
          extensions: [
            highlightViewPlugin,
            variableHighlightTheme,
            EditorView.updateListener.of((u) => {
              if (u.docChanged) {
                const newVal = u.state.doc.toString();
                lastValueRef.current = newVal;
                onChange(newVal);
              }
            }),
            EditorView.lineWrapping,
          ],
        }),
        parent: hostRef.current,
      });

      viewRef.current = view;
      lastValueRef.current = value;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external value changes (e.g. after clause insert/renumber replaces whole doc)
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      if (current !== value && lastValueRef.current !== value) {
        // Replace the full document with the new value
        view.dispatch({
          changes: { from: 0, to: current.length, insert: value },
        });
        lastValueRef.current = value;
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      insertAtCursor(text: string) {
        const view = viewRef.current;
        if (!view) return;
        const selHead = view.state.selection.main.head;
        view.dispatch({
          changes: { from: selHead, insert: text },
          selection: { anchor: selHead + text.length },
        });
        view.focus();
      },
    }));

    return (
      <div
        ref={hostRef}
        className="min-h-[300px] rounded-md border border-gray-300 font-mono text-sm focus-within:ring-1 focus-within:ring-blue-500"
        data-testid="plantilla-editor"
      />
    );
  },
);
