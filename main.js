const { app, Menu, Tray } = require('electron');
const { Timer, TimerState } = require('./timer');
const { spawn } = require('child_process');
const { nativeImage } = require('electron');

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

  restart() {
    if (!this.timer) {
      return;
    }

    this.timer.restart();
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
      this.status = `Sleep in ${time}`;
    };

    this.timer = new SleepTimer({
      start: running,
      tick: running,
      stop: notRunning,
      expire: notRunning
    });

    this.tray = new Tray(Images.tray);

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
    let items = [
      {
        enabled: false,
        label: this.status,
        icon: this.timer.isRunning ? Images.active : Images.idle
      },
      { type: 'separator' }
    ];

    if (this.timer.isRunning) {
      items = items.concat([
        { label: 'Cancel Sleep', click: () => this.timer.stop() },
        { label: 'Restart', click: () => this.timer.restart() },
        { type: 'separator' }
      ]);
    }

    if (this.timer.isStopped) {
      items = items.concat([
        { label: 'Sleep in 15 Minutes', click: () => this.timer.start(15 * 60) },
        { label: 'Sleep in 30 Minutes', click: () => this.timer.start(30 * 60) },
        { label: 'Sleep in 45 Minutes', click: () => this.timer.start(45 * 60) },
        { label: 'Sleep in 1 Hour',     click: () => this.timer.start(1 * 60 * 60) },
        { label: 'Sleep in 2 Hours',    click: () => this.timer.start(2 * 60 * 60) },
        { type: 'separator' }
      ]);
    }

    items.push(
      { label: 'Quit', click: () => this.app.quit() }
    );

    this.tray.setToolTip(this.status);
    this.tray.setContextMenu(Menu.buildFromTemplate(items));
  }
}

app.dock.hide();
app.on('ready', () => {
  new App(app);
});
