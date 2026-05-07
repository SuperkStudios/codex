var EventEmitter = require('events').EventEmitter
  , util = require('util');

module.exports = Eventer;

function Eventer () {
  EventEmitter.call(this);
}

util.inherits(Eventer, EventEmitter);

Eventer.prototype._eventName = function (event) {
  return Array.isArray(event) ? event.join(':') : event;
};

Eventer.prototype.on = function (event, listener) {
  return EventEmitter.prototype.on.call(this, this._eventName(event), listener);
};

Eventer.prototype.once = function (event, listener) {
  return EventEmitter.prototype.once.call(this, this._eventName(event), listener);
};

Eventer.prototype.emit = function (event) {
  var args = Array.prototype.slice.call(arguments)
    , emitted;
  args[0] = this._eventName(event);

  if (args[0] === 'error' && this.listenerCount('error') === 0)
    return false;

  emitted = EventEmitter.prototype.emit.apply(this, args);

  if (!emitted && Array.isArray(event) && event.length > 1) {
    args[0] = event[0] + ' *';
    emitted = EventEmitter.prototype.emit.apply(this, args);
  }

  return emitted;
};
