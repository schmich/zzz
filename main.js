const { app, Menu, Tray, nativeImage } = require('electron');
const { Timer, TimerState } = require('./timer');
const { spawn } = require('child_process');

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
    return this._cache('tray.png', 16, 16);
  }

  static get idle() {
    return this._cache('idle.png', 16, 16);
  }

  static get active() {
    return this._cache('active.png', 16, 16);
  }

  static _cache(file, width, height) {
    if (!this._images) {
      this._images = {};
    }
    let key = `${file}-${width}-${height}`;
    let image = this._images[key];
    if (!image) {
      this._images[key] = image = nativeImage.createFromPath(file).resize({ width: width, height: height })
    }
    return image;
  }
}

class Controller
{
  static run(app) {
    let controller = new Controller(app);
    controller.run();
  }

  constructor(app) {
    this.app = app;
  }

  run() {
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
    notRunning();

    const { powerMonitor } = require('electron');
    powerMonitor.on('suspend', () => {
      this.timer.stop();
    });
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
app.on('ready', () => Controller.run(app));
