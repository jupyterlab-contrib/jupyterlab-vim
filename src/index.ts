import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';
import { IEditorTracker } from '@jupyterlab/fileeditor';

import {
  IEditorExtensionRegistry,
  EditorExtensionRegistry
} from '@jupyterlab/codemirror';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';
import { vim, Vim } from '@replit/codemirror-vim';
import { EditorView } from '@codemirror/view';
import { Prec } from '@codemirror/state';

import {
  VimEditorManager,
  VimCellManager,
  IKeybinding,
  ICellContext
} from './codemirrorCommands';
import { addNotebookCommands } from './labCommands';
import { PartialJSONObject } from '@lumino/coreutils';

const PLUGIN_NAME = '@axlair/jupyterlab_vim';
const TOGGLE_ID = 'jupyterlab-vim:toggle';
let enabled = false;
let enabledInEditors = true;
let escToCmdMode = true;
let shiftEscOverrideBrowser = true;

/**
 * Initialization data for the jupyterlab_vim extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_NAME,
  autoStart: true,
  activate: activateCellVim,
  requires: [INotebookTracker, IEditorExtensionRegistry, ISettingRegistry],
  optional: [IEditorTracker]
};

async function activateCellVim(
  app: JupyterFrontEnd,
  notebookTracker: INotebookTracker,
  editorExtensionRegistry: IEditorExtensionRegistry,
  settingRegistry: ISettingRegistry,
  editorTracker: IEditorTracker
): Promise<void> {
  const theme = Prec.highest(
    EditorView.theme({
      '.cm-fat-cursor': {
        position: 'absolute',
        background: 'var(--jp-vim-cursor-color)',
        border: 'none',
        whiteSpace: 'pre'
      },
      '&:not(.cm-focused) .cm-fat-cursor': {
        background: 'none',
        outline: 'solid 1px var(--jp-vim-cursor-color)',
        color: 'transparent !important'
      }
    })
  );

  editorExtensionRegistry.addExtension({
    name: 'vim',
    factory: options => {
      return EditorExtensionRegistry.createConditionalExtension([
        theme,
        vim({
          status: false
        })
      ]);
    }
  });

  app.commands.addCommand(TOGGLE_ID, {
    label: 'Enable Vim Mode',
    execute: () => {
      if (settingRegistry) {
        void settingRegistry.set(`${PLUGIN_NAME}:plugin`, 'enabled', !enabled);
      }
    },
    isToggled: () => enabled
  });

  app.commands.addCommand('vim:enter-normal-mode', {
    label: 'Enter Normal Vim Mode',
    execute: () => {
      const current = app.shell.currentWidget;
      if (!current) {
        console.warn('Current widget not found');
      } else if (editorTracker.currentWidget === current) {
        editorManager.modifyEditor(editorTracker.currentWidget.content.editor);
      } else if (notebookTracker.currentWidget === current) {
        const activeCellContext = {
          index: notebookTracker.currentWidget.content.activeCellIndex,
          cellCount: notebookTracker.currentWidget.content.widgets.length
        } as ICellContext;
        cellManager.modifyCell(
          notebookTracker.currentWidget.content.activeCell,
          activeCellContext
        );
      } else {
        console.warn('Current widget is not vim-enabled');
      }
    },
    isEnabled: () => enabled
  });

  const userKeybindings = (
    await settingRegistry.get(`${PLUGIN_NAME}:plugin`, 'extraKeybindings')
  ).composite as unknown as Array<IKeybinding>;

  const cellManager = new VimCellManager({
    commands: app.commands,
    enabled,
    userKeybindings
  });
  const editorManager = new VimEditorManager({
    enabled: enabled && enabledInEditors,
    userKeybindings
  });

  let escBinding: IDisposable | null = null;
  let hasEverBeenEnabled = false;

  Vim.defineEx('write', 'w', () => {
    app.commands.execute('docmanager:save');
  });

  Vim.defineEx('quit', 'q', () => {
    // In JupyterLab 4.0 needs to be executed after vim panel has closed, here
    // achived by moving it to end of execution stack with `setTimeout()`.
    setTimeout(() => {
      app.commands.execute('notebook:enter-command-mode');
    });
  });

  // it's ok to connect here because we will never reach the vim section unless
  // ensureVimKeyMap has been called due to the checks for enabled.
  // we need to have now in order to keep track of the last active cell
  // so that we can modify it when vim is turned on or off.
  notebookTracker.activeCellChanged.connect(
    cellManager.onActiveCellChanged,
    cellManager
  );
  editorTracker.currentChanged.connect(
    editorManager.onActiveEditorChanged,
    editorManager
  );
  const shell = app.shell as ILabShell;
  shell.currentChanged.connect(() => {
    const current = shell.currentWidget;
    if (!current) {
      // no-op
    } else if (editorTracker.currentWidget === current) {
      editorManager.modifyEditor(editorTracker.currentWidget.content.editor);
    } else if (notebookTracker.currentWidget === current) {
      const activeCellContext = {
        index: notebookTracker.currentWidget.content.activeCellIndex,
        cellCount: notebookTracker.currentWidget.content.widgets.length
      } as ICellContext;
      cellManager.modifyCell(
        notebookTracker.currentWidget.content.activeCell,
        activeCellContext
      );
    } else {
      // no-op
    }
  });

  addNotebookCommands(app, notebookTracker);

  async function updateSettings(
    settings: ISettingRegistry.ISettings
  ): Promise<void> {
    const userKeybindings = (
      await settingRegistry.get(`${PLUGIN_NAME}:plugin`, 'extraKeybindings')
    ).composite as unknown as Array<IKeybinding>;

    enabled = settings.get('enabled').composite === true;
    enabledInEditors = settings.get('enabledInEditors').composite === true;

    const cmdModeKeys = settings.get('cmdModeKeys')
      .composite as PartialJSONObject;
    if (!cmdModeKeys) {
      // no-op
    } else {
      escToCmdMode = cmdModeKeys['escToCmdMode'] as boolean;
      shiftEscOverrideBrowser = cmdModeKeys[
        'shiftEscOverrideBrowser'
      ] as boolean;
    }

    app.commands.notifyCommandChanged(TOGGLE_ID);

    cellManager.enabled = enabled;
    cellManager.userKeybindings = userKeybindings;

    editorManager.enabled = enabled && enabledInEditors;
    editorManager.userKeybindings = userKeybindings;

    if (enabled) {
      escBinding?.dispose();
      if (!hasEverBeenEnabled) {
        hasEverBeenEnabled = true;
        await app.restored;
      }
    } else {
      escBinding = app.commands.addKeyBinding({
        command: 'notebook:enter-command-mode',
        keys: ['Escape'],
        selector: '.jp-Notebook.jp-mod-editMode'
      });
    }

    notebookTracker.forEach(notebook => {
      notebook.node.dataset.jpVimMode = `${enabled}`;
      notebook.node.dataset.jpVimEscToCmdMode = `${escToCmdMode}`;
      notebook.node.dataset.jpVimShiftEscOverrideBrowser = `${shiftEscOverrideBrowser}`;
    });
    editorTracker.forEach(document => {
      document.node.dataset.jpVimMode = `${enabled && enabledInEditors}`;
    });
    editorManager?.updateLastActive();
    cellManager?.updateLastActive();

    // make sure our css selector is added to new notebooks
    notebookTracker.widgetAdded.connect((sender, notebook) => {
      notebook.node.dataset.jpVimMode = `${enabled}`;
      notebook.node.dataset.jpVimEscToCmdMode = `${escToCmdMode}`;
      notebook.node.dataset.jpVimShiftEscOverrideBrowser = `${shiftEscOverrideBrowser}`;
    });
    editorTracker.widgetAdded.connect((sender, document) => {
      document.node.dataset.jpVimMode = `${enabled && enabledInEditors}`;
    });
  }

  settingRegistry.load(`${PLUGIN_NAME}:plugin`).then(
    (settings: ISettingRegistry.ISettings) => {
      updateSettings(settings);
      settings.changed.connect(updateSettings);
    },
    (err: Error) => {
      console.error(
        `Could not load settings, so did not active ${PLUGIN_NAME}: ${err}`
      );
    }
  );
  return Promise.resolve();
}

export default extension;
