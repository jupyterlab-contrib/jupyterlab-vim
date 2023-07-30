# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

<!-- <END NEW CHANGELOG ENTRY> -->

# History

## 0.17.0 / 2023-07-30

- Support JupyterLab 4.0 (#85, thanks @krassowski)

## 0.16.0 / 2023-03-12

- Add configuration to provide custom keybindings (#74, thanks @peytondmurray)
- Add bindable command to move insert-to-normal-to-command modes (#69, thanks @asford)
- Fix bug where arrow keys navigation caused double cell hops (#77, thanks @alexveden)

## 0.15.1 / 2022-03-12

- Fixed a bug in `0.15.0` where you could no longer type `c`.

## 0.15.0 / 2022-03-11

- Homogenize the project with the jupyterlab-contrib organization (#46)
- Fix `Esc` being override by the shortcuts extensions in jupyterlab
- Restructure Project Code and make keybindings user modifiable (#58)
- Add a menu button for enable/disable (#58)

## 0.14.0 / 2021-05-04

- Add ability to enable/disable plugin in settings (#24)

## 0.13.3 / 2021-02-22

- Fix saving column position when moving by lines (#28)

## 0.13.0 / 2020-12-10

- Support JupyterLab 3+
- Set up eslint and prettier

## 0.12.4 / 2020-05-20

- Switch from travis to GitHub actions.
- Auto deployment when merging to master.
- Auto bump of versions.

## 0.12.3 / 2020-04-25

- `z c` hides selected code cell
- `z o` shows selected code cell
- `z m` hides all code cells
- `z r` shows all code cells

## 0.12.2 / 2020-03-09

- Change package.json information

## 0.12.1 / 2020-03-06

- `ctrl [` exits Vim insert mode

## 0.12.0 / 2020-03-06

- Support JupyterLab 2.0.0+

## 0.11.0 / 2019-07-13

- Support JupyterLab 1.0.0+

## 0.10.1 / 2018-11-21

- `ctrl i` enters Vim insert mode from Jupyter command mode (#71) Thanks @wmayner

## 0.10.0 / 2018-10-08

- Update for JupyterLab 0.35

## 0.9.0 / 2018-08-22

- Update for JupyterLab 0.34 (#57) Thanks @MisterVulcan

## 0.8.0 / 2018-08-01

- Update for JupyterLab 0.33 (#52) Thanks @ah-

## 0.7.0 / 2018-04-16

- Requires JupyterLab 0.32 (Beta 2)
- ctrl-g shows function signature (#36)

## 0.6.0 / 2018-03-28

- center cell command (#33)
- `-` splits cell in vim command mode (#33)
- ctrl-c copies instead of leaving insert mode if you aren't on a mac (#34)

## 0.5.0 / 2018-03-27

- add moving cell commands
- Add delete/yank/paste cell commands (#28)
- select first and last cell shortcuts (#24)
- change to focus selector to fix debug prompt select

## 0.4.1 / 2018-02-14

- Ctrl-J and Ctrl-K execute markdown when leaving the cell.

## 0.4.0 / 2018-02-13

- Added Command/Ctrl-{1,2,3} to switch cell mode to code, markdown and raw.

## 0.3.0 / 2018-02-12

- Ex commands ':q' and ':quit' leave vim mode

## 0.2.1 / 2018-01-13

- bump package requirements, revert unnecessary commands for staying in edit mode
- ":w" saves notebook

## 0.2.0 / 2018-01-12

- Update to JupyterLab 0.31 (Beta1)

## 0.1.0 / 2017-12-09

- Initial Release!
- Vim mode in notebook cells
- Copy, Cut, Paste commands
- Vim motions moving between cells
- Several commands extended to remain in Vim mode
