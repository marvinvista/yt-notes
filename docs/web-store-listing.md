# Chrome Web Store Listing Draft

## Name

YT Notes

## Short Description

Take notes beside YouTube videos with autosave, timestamps, and Markdown export.

## Detailed Description

Take focused notes while watching YouTube videos without losing your place.

`YT Notes` opens a clean writing surface beside the current YouTube video and saves notes per video automatically. Type `/t` to stamp the current playback time onto the active line, click any saved timestamp to jump back to that moment, and export your notes as a well-formatted Markdown file when you're done.

### Features

- notes saved locally for each YouTube video
- fast `/t` timestamp shortcut
- click timestamps to seek the video
- export notes as Markdown with video name and URL
- light and dark mode that follows system appearance

## Single Purpose

YT Notes lets a user take timestamped notes while watching YouTube videos.

## Permission Justifications

- `storage`: stores notes locally so they persist between sessions
- `tabs`: finds the active YouTube watch tab to load the correct note
- `scripting`: reads the live playback time and seeks the current video when a timestamp is clicked
- `sidePanel`: opens the notes workspace in Chrome's side panel
- `webNavigation`: updates side-panel availability as YouTube changes pages without a full reload

## Privacy Fields Draft

### Data collected

- user-provided content: notes typed by the user

### Data use

- app functionality only

### Data sale

- no

### Data sharing

- no

## Manual Assets Still Needed

- store icon upload: use `assets/icons/icon-128.png`
- at least one Chrome Web Store screenshot
- small promo tile if required by the current listing flow
- hosted privacy policy URL
