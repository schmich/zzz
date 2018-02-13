/*
  TODO
  - If computer sleeps before scheduled sleep (e.g. clsoing lid), stop scheduled sleep, notify user about interruption
  - Sleep presets (5/10/15/30/60 mins)
  - Status in menu, like Docker
*/

const { app, Menu, Tray } = require('electron');
const { spawn } = require('child_process');
const nativeImage = require('electron').nativeImage;

class Alarm
{
  constructor(action) {
    this.action = action;
    this.timeout = null;
  }

  start(seconds) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    setTimeout(() => this.action(), seconds * 1000);
  }
}

let alarm = new Alarm(() => {
  spawn('pmset', ['sleepnow']);
  // TODO: Set state to finished.
});

app.on('ready', () => {
  let image = nativeImage.createFromPath('zzz.png').resize({ width: 16, height: 16 });
  let tray = new Tray(image)
  const contextMenu = Menu.buildFromTemplate([
    {
      enabled: false,
      label: 'Status: Not Running'
    },
    {
      type: 'separator'
    },
    {
      label: 'Sleep in 30 Minutes',
      click() {
        alarm.start(30 * 60);
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click() {
        app.quit()
      }
    }
  ]);
  tray.setToolTip('Status: Not Running');
  tray.setContextMenu(contextMenu);
});
