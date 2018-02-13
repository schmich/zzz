/*
  TODO
  - If computer sleeps before scheduled sleep (e.g. clsoing lid), stop scheduled sleep, notify user about interruption
  - Sleep presets (5/10/15/30/60 mins)
  - Status in menu, like Docker
*/

const { app, Menu, Tray } = require('electron');
const { Timer, TimerState } = require('./timer');
const { spawn } = require('child_process');
const nativeImage = require('electron').nativeImage;

class SleepTimer
{
  constructor(observer) {
    this.timer = null;
    this.observer = observer;
  }

  start(duration) {
    this.stop();
    this.timer = this._createTimer(duration);
    this.timer.start();
  }

  stop() {
    if (!this.timer) {
      return;
    }

    this.timer.stop();
  }

  get state() {
    return this.timer ? this.timer.state : TimerState.Stopped;
  }

  get isStopped() {
    return !this.timer || this.timer.isStopped;
  }

  get isRunning() {
    return this.timer && this.timer.isRunning;
  }

  get isPaused() {
    return this.timer && this.timer.isPaused;
  }

  _createTimer(duration) {
    let timer = new Timer(duration, 60);

    timer.observe(this.observer);

    timer.on('tick', () => {
    });

    timer.on('expire', () => {
      spawn('pmset', ['sleepnow']);
    });

    return timer;
  }
}

class Images
{
  static get tray() {
    return this._cache('tray.png');
  }

  static get idle() {
    return this._cache('idle.png');
  }

  static get active() {
    return this._cache('active.png');
  }

  static _cache(file) {
    if (!this._images) {
      this._images = {};
    }
    if (!this._images[file]) {
      this._images[file] = nativeImage.createFromPath(file).resize({ width: 16, height: 16 })
    }
    return this._images[file];
  }
}

class App
{
  constructor(app) {
    const notRunning = () => this.status = 'Idle';
    const running = (_, remaining) => {
      let mins = Math.round(remaining / 60);
      let time = `${mins} Minute${mins === 1 ? '' : 's'}`;
      if (mins < 1) {
        time = '< 1 Minute';
      }
      this.status = `Sleeping in ${time}`;
    };

    this.timer = new SleepTimer({
      start: running,
      stop: notRunning,
      expire: notRunning,
      tick: running
    });

    const image = Images.tray;
    this.tray = new Tray(image);

    this.app = app;
    notRunning();
  }

  get status() {
    return this._status;
  }

  set status(status) {
    this._status = status;
    this._refresh();
  }

  _refresh() {
    let status = `Status: ${this.status}`;

    let icon = this.timer.isRunning ? Images.active : Images.idle;
    let items = [
      {
        enabled: false,
        label: status,
        icon: icon
      },
      {
        type: 'separator'
      }
    ];

    if (this.timer.isRunning) {
      items = items.concat([
        {
          label: 'Cancel Sleep',
          click: () => {
            this.timer.stop();
          }
        },
        {
          type: 'separator'
        }
      ]);
    }

    if (this.timer.isStopped) {
      items = items.concat([
        {
          label: 'Sleep in 15 Minutes',
          click: () => {
            this.timer.start(15 * 60);
          }
        },
        {
          label: 'Sleep in 30 Minutes',
          click: () => {
            this.timer.start(30 * 60);
          }
        },
        {
          label: 'Sleep in 60 Minutes',
          click: () => {
            this.timer.start(60 * 60);
          }
        },
        {
          type: 'separator'
        }
      ]);
    }

    items.push(
      {
        label: 'Quit',
        click: () => {
          this.app.quit()
        }
      }
    );

    this.tray.setToolTip(status);
    this.tray.setContextMenu(Menu.buildFromTemplate(items));
  }
}

app.on('ready', () => {
  new App(app);
});
