import { JupyterFrontEnd } from '@jupyterlab/application';
import { MarkdownCell } from '@jupyterlab/cells';
import { Vim, getCM } from '@replit/codemirror-vim';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from '@jupyterlab/notebook';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';

export function addNotebookCommands(
  app: JupyterFrontEnd,
  tracker: INotebookTracker
): Array<IDisposable> {
  const { commands, shell } = app;
  function getCurrent(args: ReadonlyPartialJSONObject): NotebookPanel | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;

    // Should we expose `activeWidget` in `IShell`?
    // when `activateById` is called the Notebook handler focuses current editor
    // which leads to bluring the panel for inputing ex commands and may render
    // the use of ex commands impossible if called needlesly.
    if (activate && widget && shell.currentWidget !== widget) {
      shell.activateById(widget.id);
    }

    return widget;
  }
  function isEnabled(): boolean {
    return (
      tracker.currentWidget !== null &&
      tracker.currentWidget === app.shell.currentWidget
    );
  }
  const addedCommands = [
    commands.addCommand('vim:run-select-next-edit', {
      label: 'Run Cell and Edit Next Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { context, content } = current;
          NotebookActions.runAndAdvance(content, context.sessionContext);
          current.content.mode = 'edit';
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:run-cell-and-edit', {
      label: 'Run Cell and Edit Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { context, content } = current;
          NotebookActions.run(content, context.sessionContext);
          // Don't re-enter edit mode for markdown cells
          if (
            content.activeCell !== null &&
            content.activeCell.model.type === 'markdown'
          ) {
            // no-op
          } else {
            current.content.mode = 'edit';
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:cut-cell-and-edit', {
      label: 'Cut Cell(s) and Edit Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          NotebookActions.cut(content);
          content.mode = 'edit';
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:copy-cell-and-edit', {
      label: 'Copy Cell(s) and Edit Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          NotebookActions.copy(content);
          content.mode = 'edit';
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:paste-cell-and-edit', {
      label: 'Paste Cell(s) and Edit Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          NotebookActions.paste(content, 'below');
          content.mode = 'edit';
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:merge-and-edit', {
      label: 'Merge and Edit Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          NotebookActions.mergeCells(content);
          current.content.mode = 'edit';
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:enter-insert-mode', {
      label: 'Enter Insert Mode',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          if (content.activeCell !== null) {
            const editor = content.activeCell.editor as CodeMirrorEditor;
            current.content.mode = 'edit';
            const cm = getCM(editor.editor);
            if (!cm) {
              console.error('CodeMirror vim wrapper not found');
              return;
            }
            Vim.handleKey(cm, 'i');
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:leave-insert-mode', {
      label: 'Leave Insert Mode',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          if (content.activeCell !== null) {
            const editor = content.activeCell.editor as CodeMirrorEditor;
            const cm = getCM(editor.editor);
            if (!cm) {
              console.error('CodeMirror vim wrapper not found');
              return;
            }
            Vim.handleKey(cm, '<Esc>');
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:leave-current-mode', {
      label: 'Move Insert to Normal to Jupyter Command Mode',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          if (content.activeCell !== null) {
            const editor = content.activeCell.editor as CodeMirrorEditor;

            const cm = getCM(editor.editor);
            if (!cm) {
              console.error('CodeMirror vim wrapper not found');
              return;
            }
            const vim = cm.state.vim;

            // Get the current editor state
            if (
              vim.insertMode ||
              vim.visualMode ||
              vim.inputState.operator !== null ||
              vim.inputState.motion !== null ||
              vim.inputState.keyBuffer.length !== 0
            ) {
              Vim.handleKey(cm, '<Esc>');
            } else {
              commands.execute('notebook:enter-command-mode');
            }
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:select-below-execute-markdown', {
      label: 'Execute Markdown and Select Cell Below',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          if (
            content.activeCell !== null &&
            content.activeCell.model.type === 'markdown'
          ) {
            (current.content.activeCell as MarkdownCell).rendered = true;
          }
          return NotebookActions.selectBelow(current.content);
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:select-above-execute-markdown', {
      label: 'Execute Markdown and Select Cell Above',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          if (
            content.activeCell !== null &&
            content.activeCell.model.type === 'markdown' &&
            content.activeCellIndex !== 0
          ) {
            (current.content.activeCell as MarkdownCell).rendered = true;
          }
          return NotebookActions.selectAbove(current.content);
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:select-first-cell', {
      label: 'Select First Cell',
      execute: async args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          content.activeCellIndex = 0;
          content.deselectAll();
          if (content.activeCell !== null) {
            // note: using `scrollToItem` because `scrollToCell` changes mode (activate the cell)
            await content.scrollToItem(content.activeCellIndex, 'smart');
            content.activeCell.node.focus();
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:select-last-cell', {
      label: 'Select Last Cell',
      execute: async args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          content.activeCellIndex = current.content.widgets.length - 1;
          content.deselectAll();
          if (content.activeCell !== null) {
            // note: using `scrollToItem` because `scrollToCell` changes mode (activates the cell)
            await content.scrollToItem(content.activeCellIndex, 'smart');
            content.activeCell.node.focus();
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:center-cell', {
      label: 'Center Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current && current.content.activeCell !== null) {
          current.content.scrollToCell(current.content.activeCell, 'center');
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:no-action', {
      label: 'Prevent Default Browser Action',
      caption:
        'Prevent default action for some keybindings (defined in the settings); for example Firefox binds Shift + Esc to its Process Manager which conflicts with the expected action in the vim mode.',
      execute: args => {
        // no-op
      }
    })
  ];
  return addedCommands;
}
