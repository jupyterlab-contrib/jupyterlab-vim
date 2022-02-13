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

function activateCellVim(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  jlabCodeMirror: ICodeMirror,
  settingRegistry: ISettingRegistry
): Promise<void> {
  // eslint-disable-next-line prettier/prettier
  const globalCodeMirror = jlabCodeMirror.CodeMirror as unknown as CodeMirrorEditor;
  let cellManager: VimCellManager | null = null;
  let escBinding: IDisposable | null = null;

  let addedCommands: Array<IDisposable> | null = null;
  let hasEverBeenEnabled = false;

  async function updateSettings(
    settings: ISettingRegistry.ISettings
  ): Promise<void> {
    enabled = settings.get('enabled').composite === true;
    if (cellManager) {
      cellManager.enabled = enabled;
    }
    if (enabled) {
      escBinding?.dispose();
      if (!hasEverBeenEnabled) {
        hasEverBeenEnabled = true;
        await app.restored;
        await jlabCodeMirror.ensureVimKeymap();
        cellManager = new VimCellManager(
          app.commands,
          globalCodeMirror,
          enabled
        );
        tracker.activeCellChanged.connect(
          cellManager.onActiveCellChanged,
          cellManager
        );
      }
      addedCommands = addJLabCommands(app, tracker, globalCodeMirror);
    } else {
      addedCommands?.forEach(command => command.dispose());
      escBinding = app.commands.addKeyBinding({
        command: 'notebook:enter-command-mode',
        keys: ['Escape'],
        selector: '.jp-Notebook.jp-mod-editMode'
      });
    }
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
