import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import { ICodeMirror, CodeMirrorEditor } from '@jupyterlab/codemirror';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IDisposable } from '@lumino/disposable';

import { VimCellManager } from './codemirrorCommands';
import { addJLabCommands } from './labCommands';

const PLUGIN_NAME = '@axlair/jupyterlab_vim';
const TOGGLE_ID = 'jupyterlab-vim:toggle';
let enabled = false;

/**
 * Initialization data for the jupyterlab_vim extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_NAME,
  autoStart: true,
  activate: activateCellVim,
  requires: [INotebookTracker, ICodeMirror, ISettingRegistry]
};

async function activateCellVim(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  jlabCodeMirror: ICodeMirror,
  settingRegistry: ISettingRegistry
): Promise<void> {
  // await app.restored;
  app.commands.addCommand(TOGGLE_ID, {
    label: 'Enable Notebook Vim mode',
    execute: () => {
      if (settingRegistry) {
        void settingRegistry.set(`${PLUGIN_NAME}:plugin`, 'enabled', !enabled);
      }
    },
    isToggled: () => enabled
  });
  // eslint-disable-next-line prettier/prettier
  const globalCodeMirror = jlabCodeMirror.CodeMirror as unknown as CodeMirrorEditor;
  let cellManager: VimCellManager | null = null;
  let escBinding: IDisposable | null = null;

  let addedCommands: Array<IDisposable> | null = null;
  let hasEverBeenEnabled = false;

  cellManager = new VimCellManager(app.commands, globalCodeMirror, enabled);
  // it's ok to connect here because we will never reach the vim section unless
  // ensureVimKeyMap has been called due to the checks for enabled.
  // we need to have now in order to keep track of the last active cell
  // so that we can modify it when vim is turned on or off.
  tracker.activeCellChanged.connect(
    cellManager.onActiveCellChanged,
    cellManager
  );
  async function updateSettings(
    settings: ISettingRegistry.ISettings
  ): Promise<void> {
    enabled = settings.get('enabled').composite === true;
    app.commands.notifyCommandChanged(TOGGLE_ID);
    if (cellManager) {
      cellManager.enabled = enabled;
    }
    if (enabled) {
      escBinding?.dispose();
      if (!hasEverBeenEnabled) {
        hasEverBeenEnabled = true;
        await app.restored;
        await jlabCodeMirror.ensureVimKeymap();
      }
      addedCommands = addJLabCommands(app, tracker, globalCodeMirror);
      cellManager?.modifyCell(cellManager.lastActiveCell);
      tracker.forEach(notebook => {
        notebook.node.dataset.jpVimMode = 'true';
      });
    } else {
      addedCommands?.forEach(command => command.dispose());
      escBinding = app.commands.addKeyBinding({
        command: 'notebook:enter-command-mode',
        keys: ['Escape'],
        selector: '.jp-Notebook.jp-mod-editMode'
      });
      cellManager?.modifyCell(cellManager.lastActiveCell);
      tracker.forEach(notebook => {
        notebook.node.dataset.jpVimMode = 'false';
      });
    }

    // make sure our css selector is added to new notebooks
    tracker.widgetAdded.connect((sender, notebook) => {
      notebook.node.dataset.jpVimMode = `${enabled}`;
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
