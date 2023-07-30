import { Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { INotebookTracker } from '@jupyterlab/notebook';
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

export interface IOptions {
  commands: CommandRegistry;
  enabled: boolean;
  userKeybindings: IKeybinding[];
}

export class VimCellManager {
  constructor({ commands, enabled, userKeybindings }: IOptions) {
    this._commands = commands;
    this.enabled = enabled;
    this.lastActiveCell = null;
    this.userKeybindings = userKeybindings ?? [];
  }

  onActiveCellChanged(
    tracker: INotebookTracker,
    activeCell: Cell<ICellModel> | null
  ): void {
    this.modifyCell(activeCell).catch(console.error);
  }

  async modifyCell(activeCell: Cell<ICellModel> | null): Promise<void> {
    if (!activeCell) {
      return;
    }
    this.lastActiveCell = activeCell;
    await activeCell.ready;
    const editor = activeCell.editor as CodeMirrorEditor | null;

    if (activeCell.isDisposed) {
      console.warn('Cell was already disposed, cannot setup vim mode');
      return;
    }

    if (!editor) {
      throw Error('Cell editor not available');
    }

    const view = editor.editor;

    if (this.enabled) {
      if (!editor.getOption('vim')) {
        // this erases state, we do not want to call it if not needed.
        editor.setOption('vim', true);

        // On each key press the notebook (`Notebook.handleEvent`) invokes
        // a handler ensuring focus (`Notebook._ensureFocus`); the logic does
        // not work well for the `ex commands` panel which is always interpreted
        // as blurred because it exists outside of the CodeMirror6 state; here
        // we override `hasFocus` handler to ensure it is taken into account.
        const cm = getCM(view)!;
        editor.hasFocus = () => {
          if (
            cm.state.dialog &&
            cm.state.dialog.contains(document.activeElement)
          ) {
            return true;
          }
          return view.hasFocus;
        };
      }
      const lcm = getCM(view);
      const lvim = Vim;

      // Clear existing user keybindings, then re-register in case they changed in the user settings
      ['normal', 'visual', 'insert'].forEach(ctx => lvim.mapclear(ctx));
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
              lvim.map(command, keys, context);
            } else {
              lvim.noremap(command, keys, context);
            }
          }
        }
      );

      Vim.handleKey(lcm, '<Esc>');

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
          if (currentCell !== null && currentCell.model.type === 'markdown') {
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
              const last_char = view.state.doc.line(last + 1).length;
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
      lvim.defineMotion('moveByLinesOrCell', moveByLinesOrCell);

      lvim.mapCommand(
        '<Up>',
        'motion',
        'moveByLinesOrCell',
        { forward: false, linewise: true, handleArrow: true },
        { context: 'normal' }
      );
      lvim.mapCommand(
        '<Down>',
        'motion',
        'moveByLinesOrCell',
        { forward: true, linewise: true, handleArrow: true },
        { context: 'normal' }
      );
      lvim.mapCommand(
        'k',
        'motion',
        'moveByLinesOrCell',
        { forward: false, linewise: true },
        { context: 'normal' }
      );
      lvim.mapCommand(
        'j',
        'motion',
        'moveByLinesOrCell',
        { forward: true, linewise: true },
        { context: 'normal' }
      );

      lvim.defineAction('moveCellDown', (cm: any, actionArgs: any) => {
        this._commands.execute('notebook:move-cell-down');
      });
      lvim.defineAction('moveCellUp', (cm: any, actionArgs: any) => {
        this._commands.execute('notebook:move-cell-up');
      });
      lvim.mapCommand(
        '<C-e>',
        'action',
        'moveCellDown',
        {},
        { extra: 'normal' }
      );
      lvim.mapCommand('<C-y>', 'action', 'moveCellUp', {}, { extra: 'normal' });
      lvim.defineAction('splitCell', (cm: any, actionArgs: any) => {
        this._commands.execute('notebook:split-cell-at-cursor');
      });
      lvim.mapCommand('-', 'action', 'splitCell', {}, { extra: 'normal' });
    } else if (editor.getOption('vim')) {
      editor.setOption('vim', false);
    }
  }

  private _commands: CommandRegistry;
  public lastActiveCell: Cell<ICellModel> | null;
  public enabled: boolean;
  public userKeybindings: IKeybinding[];
}
