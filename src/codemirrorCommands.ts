import { Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import { CommandRegistry } from '@lumino/commands';
import { Vim, getCM, CodeMirror } from '@replit/codemirror-vim';

// It may be worth contributing types for these upstream
interface IVimCodeMirror extends CodeMirror {
  moveByLines: undefined;
  moveByDisplayLines: undefined;
  moveByScroll: undefined;
  moveToColumn: undefined;
  moveToEol: undefined;
}

export interface IKeybinding {
  command: string;
  keys: string;
  context: string;
  mapfn: string;
  enabled: boolean;
}

export namespace VimEditorManager {
  export interface IOptions {
    enabled: boolean;
    userKeybindings: IKeybinding[];
  }
}

export namespace VimCellManager {
  export interface IOptions extends VimEditorManager.IOptions {
    commands: CommandRegistry;
  }
}

interface IUndoOptions {
  repeat: number;
  repeatIsExplicit: boolean;
  registerName: unknown;
}

export interface ICellContext {
  index?: number;
  cellCount?: number;
}

export class VimEditorManager {
  constructor({ enabled, userKeybindings }: VimEditorManager.IOptions) {
    this.enabled = enabled;
    this.userKeybindings = userKeybindings ?? [];
  }

  async onActiveEditorChanged(
    tracker: IEditorTracker,
    activeEditor: IDocumentWidget<FileEditor> | null
  ): Promise<void> {
    if (!activeEditor) {
      return;
    }
    await activeEditor.content.ready;
    this.modifyEditor(activeEditor.content.editor);
  }

  updateLastActive() {
    if (!this._lastActiveEditor) {
      return;
    }
    this.modifyEditor(this._lastActiveEditor);
  }

  /**
   * Hook up vim mode into given editor.
   * Returns true if vim mode was enabled.
   */
  modifyEditor(editor: CodeEditor.IEditor | null): boolean {
    if (!editor) {
      throw Error('Editor not available');
    }
    // JupyterLab 4.0 only supports CodeMirror editors
    const mirrorEditor = editor as CodeMirrorEditor;

    this._lastActiveEditor = mirrorEditor;

    const view = mirrorEditor.editor;

    if (this.enabled) {
      if (!mirrorEditor.getOption('vim')) {
        // this erases state, we do not want to call it if not needed.
        mirrorEditor.setOption('vim', true);

        // On each key press the notebook (`Notebook.handleEvent`) invokes
        // a handler ensuring focus (`Notebook._ensureFocus`); the logic does
        // not work well for the `ex commands` panel which is always interpreted
        // as blurred because it exists outside of the CodeMirror6 state; here
        // we override `hasFocus` handler to ensure it is taken into account.
        const cm = getCM(view)!;
        cm.on('vim-mode-change', () => {
          editor.host.dataset.jpVimModeName = cm.state.vim.mode;
        });
        mirrorEditor.hasFocus = () => {
          if (
            cm.state.dialog &&
            cm.state.dialog.contains(document.activeElement)
          ) {
            return true;
          }
          return view.hasFocus;
        };
      }

      // Override vim-mode undo/redo to make it work with JupyterLab RTC-aware
      // history; it needs to happen on every change of the editor.
      Vim.defineAction('undo', (cm: CodeMirror, options: IUndoOptions) => {
        for (let i = 0; i < options.repeat; i++) {
          editor!.undo();
        }
      });
      Vim.defineAction('redo', (cm: CodeMirror, options: IUndoOptions) => {
        for (let i = 0; i < options.repeat; i++) {
          editor!.redo();
        }
      });

      const lcm = getCM(view);

      // Clear existing user keybindings, then re-register in case they changed in the user settings
      ['normal', 'visual', 'insert'].forEach(ctx => Vim.mapclear(ctx));
      this.userKeybindings.forEach(
        ({
          command,
          keys,
          context,
          mapfn,
          enabled: keybindEnabled
        }: IKeybinding) => {
          if (keybindEnabled) {
            if (mapfn === 'map') {
              Vim.map(command, keys, context);
            } else {
              Vim.noremap(command, keys, context);
            }
          }
        }
      );

      Vim.handleKey(lcm, '<Esc>');

      return true;
    } else if (mirrorEditor.getOption('vim')) {
      mirrorEditor.setOption('vim', false);
      return false;
    }
    return false;
  }

  private _lastActiveEditor: CodeEditor.IEditor | null = null;
  public enabled: boolean;
  public userKeybindings: IKeybinding[];
}

export class VimCellManager extends VimEditorManager {
  constructor({ commands, enabled, userKeybindings }: VimCellManager.IOptions) {
    super({ userKeybindings, enabled });
    this._commands = commands;
  }

  onActiveCellChanged(
    tracker: INotebookTracker,
    activeCell: Cell<ICellModel> | null
  ): void {
    const activeCellContext = {
      index: tracker.currentWidget?.content.activeCellIndex,
      cellCount: tracker.currentWidget?.content.widgets.length
    } as ICellContext;
    this.modifyCell(activeCell, activeCellContext).catch(console.error);
  }

  updateLastActive() {
    if (!this._lastActiveCell || !this._lastActiveCellContext) {
      return;
    }
    this.modifyCell(this._lastActiveCell, this._lastActiveCellContext);
  }

  async modifyCell(
    activeCell: Cell<ICellModel> | null,
    activeCellContext: ICellContext
  ): Promise<void> {
    if (!activeCell || !activeCellContext) {
      return;
    }
    this._lastActiveCell = activeCell;
    this._lastActiveCellContext = activeCellContext;
    await activeCell.ready;

    if (activeCell.isDisposed) {
      console.warn('Cell was already disposed, cannot setup vim mode');
      return;
    }
    const wasEnabled = this.modifyEditor(activeCell.editor);
    if (wasEnabled) {
      this._modifyEdgeNavigation(activeCell, activeCellContext);
    }
  }

  private _modifyEdgeNavigation(
    activeCell: Cell<ICellModel>,
    activeCellContext: ICellContext
  ) {
    // Define a function to use as Vim motion
    // This replaces the codemirror moveByLines function to
    // for jumping between notebook cells.
    const moveByLinesOrCell = (
      cm: IVimCodeMirror,
      head: any,
      motionArgs: any,
      vim: any
    ): any => {
      const cur = head;
      let endCh = cur.ch;
      const currentCell = activeCell;
      // TODO: these references will be undefined
      // Depending what our last motion was, we may want to do different
      // things. If our last motion was moving vertically, we want to
      // preserve the HPos from our last horizontal move.  If our last motion
      // was going to the end of a line, moving vertically we should go to
      // the end of the line, etc.
      switch (vim?.lastMotion) {
        case cm.moveByLines:
        case cm.moveByDisplayLines:
        case cm.moveByScroll:
        case cm.moveToColumn:
        case cm.moveToEol:
        // JUPYTER PATCH: add our custom method to the motion cases
        // eslint-disable-next-line no-fallthrough
        case moveByLinesOrCell:
          endCh = vim.lastHPos;
          break;
        default:
          vim.lastHPos = endCh;
      }
      const repeat = motionArgs.repeat + (motionArgs.repeatOffset || 0);
      let line = motionArgs.forward ? cur.line + repeat : cur.line - repeat;
      const first = cm.firstLine();
      const last = cm.lastLine();
      const posV = cm.findPosV(
        cur,
        motionArgs.forward ? repeat : -repeat,
        'line',
        vim.lastHSPos
      );
      const hasMarkedText = motionArgs.forward
        ? posV.line > line
        : posV.line < line;
      if (hasMarkedText) {
        line = posV.line;
        endCh = posV.ch;
      }

      // JUPYTER PATCH BEGIN
      // here we insert the jumps to the next cells

      if (line < first || line > last) {
        // var currentCell = ns.notebook.get_selected_cell();
        // var currentCell = tracker.activeCell;
        // var key = '';
        // `currentCell !== null should not be needed since `activeCell`
        // is already check against null (row 61). Added to avoid warning.
        if (
          currentCell !== null &&
          currentCell.model.type === 'markdown' &&
          !(!motionArgs.forward && activeCellContext.index === 0)
        ) {
          if (!motionArgs.handleArrow) {
            // markdown cells tends to improperly handle arrow keys movement,
            //  on the way up the cell is rendered, but down movement is ignored
            //  when use arrows the cell will remain unrendered (need to shift+enter)
            //  However, this is the same as Jupyter default behaviour
            (currentCell as MarkdownCell).rendered = true;
          }
          // currentCell.execute();
        }
        if (motionArgs.forward) {
          // ns.notebook.select_next();
          if (!motionArgs.handleArrow) {
            this._commands.execute('notebook:move-cursor-down');
          } else {
            // This block preventing double cell hop when you use arrow keys for navigation
            //    also arrow key navigation works properly when current cursor position
            //    at the beginning of line for up move, and at the end for down move
            const cursor = cm.getCursor();
            // CM6 is 1-based
            const last_char = cm.cm6.state.doc.line(last + 1).length;
            if (cursor.line !== last || cursor.ch !== last_char) {
              cm.setCursor(last, last_char);
              this._commands.execute('notebook:move-cursor-down');
            }
          }
          // key = 'j';
        } else {
          // ns.notebook.select_prev();
          if (!motionArgs.handleArrow) {
            this._commands.execute('notebook:move-cursor-up');
          } else {
            // This block preventing double cell hop when you use arrow keys for navigation
            //    also arrow key navigation works properly when current cursor position
            //    at the beginning of line for up move, and at the end for down move
            const cursor = cm.getCursor();
            if (cursor.line !== 0 || cursor.ch !== 0) {
              cm.setCursor(0, 0);
              this._commands.execute('notebook:move-cursor-up');
            }
          }
          // key = 'k';
        }
        return;
      }
      // JUPYTER PATCH END

      // function taken from https://github.com/codemirror/CodeMirror/blob/9d0f9d19de70abe817e8b8e161034fbd3f907030/keymap/vim.js#L3328
      function findFirstNonWhiteSpaceCharacter(text: any): number {
        if (!text) {
          return 0;
        }
        const firstNonWS = text.search(/\S/);
        return firstNonWS === -1 ? text.length : firstNonWS;
      }

      if (motionArgs.toFirstChar) {
        endCh = findFirstNonWhiteSpaceCharacter(cm.getLine(line));
        vim.lastHPos = endCh;
      }

      vim.lastHSPos = cm.charCoords(
        new CodeMirror.Pos(line, endCh),
        'div'
      ).left;
      return new CodeMirror.Pos(line, endCh);
    };
    Vim.defineMotion('moveByLinesOrCell', moveByLinesOrCell);

    Vim.mapCommand(
      '<Up>',
      'motion',
      'moveByLinesOrCell',
      { forward: false, linewise: true, handleArrow: true },
      { context: 'normal' }
    );
    Vim.mapCommand(
      '<Down>',
      'motion',
      'moveByLinesOrCell',
      { forward: true, linewise: true, handleArrow: true },
      { context: 'normal' }
    );
    Vim.mapCommand(
      'k',
      'motion',
      'moveByLinesOrCell',
      { forward: false, linewise: true },
      { context: 'normal' }
    );
    Vim.mapCommand(
      'j',
      'motion',
      'moveByLinesOrCell',
      { forward: true, linewise: true },
      { context: 'normal' }
    );

    Vim.defineAction('moveCellDown', (cm: any, actionArgs: any) => {
      this._commands.execute('notebook:move-cell-down');
    });
    Vim.defineAction('moveCellUp', (cm: any, actionArgs: any) => {
      this._commands.execute('notebook:move-cell-up');
    });
    Vim.mapCommand('<C-e>', 'action', 'moveCellDown', {}, { extra: 'normal' });
    Vim.mapCommand('<C-y>', 'action', 'moveCellUp', {}, { extra: 'normal' });
    Vim.defineAction('splitCell', (cm: any, actionArgs: any) => {
      this._commands.execute('notebook:split-cell-at-cursor');
    });
    Vim.mapCommand('-', 'action', 'splitCell', {}, { extra: 'normal' });
  }

  private _commands: CommandRegistry;
  private _lastActiveCell: Cell<ICellModel> | null = null;
  private _lastActiveCellContext: ICellContext | undefined;
}
