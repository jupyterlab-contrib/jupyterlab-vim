# jupyterlab-vim

> Community fork of <https://github.com/jwkvam/jupyterlab-vim> updated for jupyterlab 2 and 3

![Extension status](https://img.shields.io/badge/status-ready-success "ready to be used")
[![Github Actions Status](https://github.com/jupyterlab-contrib/jupyterlab-vim/workflows/Build/badge.svg)](https://github.com/jupyterlab-contrib/jupyterlab-vim/actions?query=workflow%3ABuild)
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab-contrib/jupyterlab-vim/master?urlpath=lab)
[![npm version](https://img.shields.io/npm/v/@axlair/jupyterlab_vim)](https://www.npmjs.com/package/@axlair/jupyterlab_vim)
[![npm downloads](https://img.shields.io/npm/dw/@axlair/jupyterlab_vim.svg)](https://www.npmjs.com/package/@axlair/jupyterlab_vim)
[![PyPI](https://img.shields.io/pypi/v/jupyterlab-vim)](https://pypi.org/project/jupyterlab-vim)
[![Conda Version](https://img.shields.io/conda/vn/conda-forge/jupyterlab_vim.svg)](https://anaconda.org/conda-forge/jupyterlab_vim)

Notebook cell vim bindings

![jlabvim](https://user-images.githubusercontent.com/86304/38079432-b7596fd8-32f3-11e8-9ebd-4b9e7823f5f9.gif)


## Modes

Like vim, Jupyterlab has a distinction between edit mode and command mode. Jupyterlab Command mode is when the cursor is not in a specific cell, and edit mode when typing in a cell.

This extension combines the Jupyterlab (Edit and Command) modes with the standard vim modes (Normal, Insert, Visual). So the set of modes now looks like:

1. Jupyterlab Command Mode
2. Jupyterlab Edit Mode
    - Insert
    - Normal
    - Visual

## Install

```bash
pip install jupyterlab-vim
```
or  with conda/mamba:
```bash
mamba install -c conda-forge jupyterlab_vim
```
For Jupyterlab<3 see [installing.md](installing.md).


## Key Bindings
To learn how to modify key bindings see the [modify-keybinds.md](modify-keybinds.md) file.

**Please note that all keys are lowercase unless `Shift` is explicitly indicated.**
For example, `Y, Y` is two lowercase `y`s, `Shift-Y, Y` is one uppercase `Y` followed by a lowercase `y`.

Shortcuts this extension introduces:

### Vim Ex commands

| Command  | Action                     |
| -------  | ------                     |
| :w[rite] | Save Notebook              |
| :q[uit]  | Enter Jupyter command mode |

### Vim command bindings

| Chord           | Action                    |
| -----           | -------                   |
| Ctrl-O, U       | Undo Cell Action          |
| -               | Split Cell at Cursor      |
| Ctrl-O, -       | Split Cell at Cursor      |
| Ctrl-O, D       | Cut Cell                  |
| Ctrl-O, Y       | Copy Cell                 |
| Ctrl-O, P       | Paste Cell                |
| Ctrl-Shift-J    | Extend Marked Cells Below |
| Ctrl-Shift-K    | Extend Marked Cells Above |
| Ctrl-O, O       | Insert Cell Below         |
| Ctrl-O, Ctrl-O  | Insert Cell Above         |
| Ctrl-J          | Select Cell Below         |
| Ctrl-K          | Select Cell Above         |
| Ctrl-O, G       | Select First Cell         |
| Ctrl-O, Ctrl-G  | Select Last Cell          |
| Ctrl-E          | Move Cell Down            |
| Ctrl-Y          | Move Cell Up              |
| Ctrl-O, Z, Z    | Center Cell               |
| Ctrl-G          | Show Tooltip              |
| Command/Ctrl-1  | Code Cell Mode            |
| Command/Ctrl-2  | Markdown Cell Mode        |
| Command/Ctrl-3  | Raw Cell Mode             |
| Shift-Escape    | Leave Vim Mode            |
| Escape, Ctrl-\[ | Exit Vim Insert Mode      |

### Jupyter command bindings

| Chord   | Action            |
| -----   | ------            |
| G, G    | Select First Cell |
| Shift-G | Select Last Cell  |
| D, D    | Delete Cell       |
| Y, Y    | Yank (Copy) Cell  |
| P       | Paste Cell        |
| Shift-P | Paste Cell Above  |
| O       | Insert Cell       |
| Shift-O | Insert Cell Above |
| U       | Undo Cell Action  |
| Ctrl-E  | Move Cells Down   |
| Ctrl-Y  | Move Cells Up     |
| Z, Z    | Center Cell       |
| Z, C    | Hide Code Cell |
| Z, O    | Show Code Cell |
| Z, M    | Hide All Code Cells |
| Z, R    | Show All Code Cells  |

## Special Thanks


From @jwkvam:

> I want to acknowledge [Alisue](https://github.com/lambdalisue) and his excellent work creating [vim bindings](https://github.com/lambdalisue/jupyter-vim-binding) for Jupyter notebooks.
> I hope this extension can meet the high bar his work set.

@jkwvam is the original author of this extension - the original version can be seen [here](https://github.com/jwkvam/jupyterlab-vim). When that version was not updated it was updated first by @axelfahy and then moved to this community organization.

## Contributing

Contributions and feedback are most welcome!

[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/0)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/0)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/1)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/1)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/2)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/2)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/3)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/3)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/4)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/4)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/5)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/5)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/6)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/6)[![](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/images/7)](https://sourcerer.io/fame/jwkvam/jwkvam/jupyterlab-vim/links/7)

### Development install

Note: You will need NodeJS to build the extension package. To install with `conda` do:

```
conda install -c conda-forge nodejs
```

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_vim directory
# Install package in development mode
pip install jupyter_packaging
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Uninstall

```bash
pip uninstall jupyterlab_vim
```
