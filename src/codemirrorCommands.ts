import { Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { INotebookTracker } from '@jupyterlab/notebook';
import { CommandRegistry } from '@lumino/commands';

/**
 * A boolean indicating whether the platform is Mac.
 */
const IS_MAC = !!navigator.platform.match(/Mac/i);

export class VimCellManager {
  constructor(
    commands: CommandRegistry,
    cm: CodeMirrorEditor,
    enabled: boolean
  ) {
    this._commands = commands;
    this._cm = cm;
    this.enabled = enabled;
    this.lastActiveCell = null;
  }

  onActiveCellChanged(
    tracker: INotebookTracker,
    activeCell: Cell<ICellModel> | null
  ): void {
    this.modifyCell(activeCell);
  }

  modifyCell(activeCell: Cell<ICellModel> | null): void {
    if (!activeCell) {
      return;
    }
    this.lastActiveCell = activeCell;
    const editor = activeCell.editor as CodeMirrorEditor;

    if (this.enabled) {
      editor.setOption('keyMap', 'vim');
      const extraKeys = editor.getOption('extraKeys') || {};

      // TODO: does can this be any codemirror?
      extraKeys['Esc'] = (this._cm as any).prototype.leaveInsertMode;
      if (!IS_MAC) {
        extraKeys['Ctrl-C'] = false;
      }

      (this._cm as any).prototype.save = (): void => {
        this._commands.execute('docmanager:save');
      };

      editor.setOption('extraKeys', extraKeys);

      const lcm = this._cm as any;
      const lvim = lcm.Vim as any;
      lvim.defineEx('quit', 'q', (cm: any) => {
        this._commands.execute('notebook:enter-command-mode');
      });

      (this._cm as any).Vim.handleKey(editor.editor, '<Esc>');

      // Define a function to use as Vim motion
      // This replaces the codemirror moveByLines function to
      // for jumping between notebook cells.
      const moveByLinesOrCell = (
        cm: any,
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
            (currentCell as MarkdownCell).rendered = true;
            // currentCell.execute();
          }
          if (motionArgs.forward) {
            // ns.notebook.select_next();
            this._commands.execute('notebook:move-cursor-down');
            // key = 'j';
          } else {
            // ns.notebook.select_prev();
            this._commands.execute('notebook:move-cursor-up');
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
          (this._cm as any).Pos(line, endCh),
          'div'
        ).left;
        return (this._cm as any).Pos(line, endCh);
      };
      lvim.defineMotion('moveByLinesOrCell', moveByLinesOrCell);

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
    } else if (editor.getOption('keyMap') === 'vim') {
      editor.setOption('keyMap', 'default');
    }
  }

  private _commands: CommandRegistry;
  private _cm: CodeMirrorEditor;
  public lastActiveCell: Cell<ICellModel> | null;
  public enabled: boolean;
}
