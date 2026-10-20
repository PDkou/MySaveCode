/* Injected at the very top of index.html by AssetServer. Turns the Java object `__DrawaryAndroid`
   (callbacks, one-way calls) into the `window.DrawaryNative` the web app expects (see src/data/nativeBridge.ts):
   promises for the calls that finish later, plain calls for the rest. */
(function () {
  var A = window.__DrawaryAndroid;
  if (!A) return;
  var pending = {};
  var seq = 0;
  // Called by Java: ok = true -> resolve(value), otherwise reject(Error(value)). `value` is already a JS value.
  window.__drawaryResolve = function (id, ok, value) {
    var p = pending[id];
    if (!p) return;
    delete pending[id];
    if (ok) p.resolve(value); else p.reject(new Error(String(value)));
  };
  function call(method, args) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      try { A[method].apply(A, [id].concat(args)); }
      catch (e) { delete pending[id]; reject(e); }
    });
  }
  window.DrawaryNative = {
    setNotificationPlan: function (json) { A.setNotificationPlan(json); },
    isBiometricAvailable: function () { return A.isBiometricAvailable() === true; },
    authenticateBiometric: function () { return call('authenticateBiometric', []).then(function (v) { return v === true; }); },
    saveFile: function (name, mime, base64) { return call('saveFile', [name, mime, base64]); },
    saveBackupToDrive: function (name, base64) { return call('saveBackupToDrive', [name, base64]); },
    printPage: function () { A.printPage(); },
    setSecureScreen: function (secure) { A.setSecureScreen(!!secure); },
    sendFeedback: function (json) { return call('sendFeedback', [json]).then(function (v) { return v === true; }); }
  };
})();
