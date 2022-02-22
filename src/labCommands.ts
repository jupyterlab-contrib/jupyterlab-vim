import { JupyterFrontEnd } from '@jupyterlab/application';
import { MarkdownCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from '@jupyterlab/notebook';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

import { IDisposable } from '@lumino/disposable';
import { ElementExt } from '@lumino/domutils';

export function addJLabCommands(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  CodeMirror: CodeMirrorEditor
): Array<IDisposable> {
  const { commands, shell } = app;
  function getCurrent(args: ReadonlyPartialJSONObject): NotebookPanel | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;

    if (activate && widget) {
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
          current.content.mode = 'edit';
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
            (CodeMirror as any).Vim.handleKey(editor.editor, 'i');
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
            (CodeMirror as any).Vim.handleKey(editor.editor, '<Esc>');
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
          return NotebookActions.selectAbove(current.content);
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:select-first-cell', {
      label: 'Select First Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          content.activeCellIndex = 0;
          content.deselectAll();
          if (content.activeCell !== null) {
            ElementExt.scrollIntoViewIfNeeded(
              content.node,
              content.activeCell.node
            );
          }
        }
      },
      isEnabled
    }),
    commands.addCommand('vim:select-last-cell', {
      label: 'Select Last Cell',
      execute: args => {
        const current = getCurrent(args);

        if (current) {
          const { content } = current;
          content.activeCellIndex = current.content.widgets.length - 1;
          content.deselectAll();
          if (content.activeCell !== null) {
            ElementExt.scrollIntoViewIfNeeded(
              content.node,
              content.activeCell.node
            );
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
          const er = current.content.activeCell.inputArea.node.getBoundingClientRect();
          current.content.scrollToPosition(er.bottom, 0);
        }
      },
      isEnabled
    })
  ];
  return addedCommands;
}
