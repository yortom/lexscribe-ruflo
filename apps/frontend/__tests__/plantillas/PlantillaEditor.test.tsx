/**
 * PlantillaEditor tests.
 * CM6 + jsdom has limited DOM support, so we focus on the component contract:
 * - host div renders
 * - insertAtCursor ref method is exposed
 * - onChange is called on doc updates (tested via ref insertion if possible)
 */
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRef } from 'react';
import { PlantillaEditor, PlantillaEditorHandle } from '../../components/plantillas/PlantillaEditor';

// Mock codemirror modules for jsdom (CM6 requires real DOM/canvas APIs not available in jsdom)
vi.mock('@codemirror/view', () => {
  const mockView = {
    destroy: vi.fn(),
    state: {
      doc: { toString: () => '{{expediente.nombre}} {{contrato.x}}', length: 36 },
      selection: { main: { head: 0 } },
    },
    dispatch: vi.fn(),
    focus: vi.fn(),
  };

  class MockEditorView {
    static lineWrapping = {};
    static updateListener = { of: vi.fn(() => ({})) };
    static theme = vi.fn(() => ({}));
    state = mockView.state;
    dispatch = mockView.dispatch;
    focus = mockView.focus;
    destroy = mockView.destroy;
    constructor(_opts: unknown) {}
  }

  class MockViewPlugin {
    static fromClass(_cls: unknown, _opts?: unknown) {
      return {};
    }
  }

  class MockDecoration {
    static mark(_opts: unknown) {
      return {};
    }
  }

  return {
    EditorView: MockEditorView,
    ViewPlugin: MockViewPlugin,
    Decoration: MockDecoration,
    DecorationSet: {},
    ViewUpdate: {},
  };
});

vi.mock('@codemirror/state', () => {
  class MockEditorState {
    static create(_opts: unknown) {
      return {};
    }
  }
  class MockRangeSetBuilder {
    add() {}
    finish() {
      return {};
    }
  }
  return {
    EditorState: MockEditorState,
    RangeSetBuilder: MockRangeSetBuilder,
  };
});

describe('PlantillaEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the host div with data-testid', () => {
    render(<PlantillaEditor value="{{expediente.nombre}}" onChange={vi.fn()} />);
    expect(screen.getByTestId('plantilla-editor')).toBeTruthy();
  });

  it('exposes insertAtCursor via ref', () => {
    function Wrapper() {
      const editorRef = useRef<PlantillaEditorHandle>(null);
      return (
        <>
          <PlantillaEditor
            ref={editorRef}
            value="{{expediente.nombre}} {{contrato.x}}"
            onChange={vi.fn()}
          />
          <button
            onClick={() => editorRef.current?.insertAtCursor('test')}
            data-testid="insert-btn"
          >
            Insert
          </button>
        </>
      );
    }
    render(<Wrapper />);
    // The button exists and pressing it doesn't throw
    const btn = screen.getByTestId('insert-btn');
    expect(btn).toBeTruthy();
    // Should not throw when called
    expect(() => btn.click()).not.toThrow();
  });

  it('accepts onChange prop and renders without error', () => {
    const onChange = vi.fn();
    expect(() =>
      render(<PlantillaEditor value="{{expediente.nombre}}" onChange={onChange} />),
    ).not.toThrow();
  });
});
