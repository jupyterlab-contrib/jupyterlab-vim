## Modifying Keybindings


This extension adds keybindings for two types of commands. The first type is vim-like keybindings for existing Jupyterlab commands. Such as  `O` for insert cell below which uses the `notebook:insert-cell-below` command. The second kind are for Jupyterlab commands provided by this extension. These commands are prefixed with `vim:`, e.g. `vim:select-below-execute-markdown`.

Both types of commands be modified the same way you modify other [jupyterlab shortcuts](https://jupyterlab.readthedocs.io/en/stable/user/interface.html#keyboard-shortcuts) (aka keybindings) via `Settings > Advanced Settings Editor > Keyboard Shortcuts`

For a complete listing of the keyboard shortcuts set by this extension see the [plugin.json](schema/plugin.json) under the `schema` folder.

### Adding your own

If you have a keybinding that you would like to add to your jupyterlab then you can use the following selectors to be active in different states of the notebook

**Jupyterlab Command Mode**

`.jp-NotebookPanel[data-jp-vim-mode='true'] .jp-Notebook:focus`

You can use any of the standard jupyterlab selectors. The only extension specific component is the `[data-jp-vim-mode='true']` on the notebookpanel selector, this will make it so that a keybinding is active only when vim mode is active.


 **In a cell - Normal mode or Insert Mode**
Jupyterlab commands don't know about the concept of vim modes so they will be active no matter what vim state the editor is in.

`.jp-NotebookPanel[data-jp-vim-mode='true'] .jp-Notebook.jp-mod-editMode`


**Vim remappings**
For vim style remappings (`inoremap`, `imap`, `nmap`...) you can use the sibling extension [jupyterlab-vimrc](https://github.com/ianhi/jupyterlab-vimrc#jupyterlab-vimrc).  

Beware that this does not work with everything you may have in your standard vimrc. Jupyterlab uses [Codemirror] for the editors in cells. This extension adds vim support by enabling the [vim](https://codemirror.net/demo/vim.html) emulation in codemirror. While this comes with partial support for remappings in your vimrc the support is incomplete.
