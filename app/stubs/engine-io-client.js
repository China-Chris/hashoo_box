/**
 * Stub for engine.io-client (used by socket.io-client / MetaMask SDK).
 * Exports a minimal Socket-like constructor so the bundle resolves.
 */
function Socket() {
  this.open = function () {};
  this.close = function () {};
  this.on = function () { return this; };
  this.off = function () { return this; };
  this.removeListener = function () { return this; };
}
module.exports = Socket;
module.exports.default = Socket;
