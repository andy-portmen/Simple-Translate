// Load Firefox based resources
var data          = require("sdk/self").data;
    sp            = require("sdk/simple-prefs"),
    Request       = require("sdk/request").Request,
    prefs         = sp.prefs,
    {Cc, Ci, Cu}  = require('chrome');

Cu.import("resource://gre/modules/Promise.jsm");
    
// Load overlay styles
require("./userstyles").load(data.url("overlay.css"));
//Install toolbar button
var button = require("./toolbarbutton").ToolbarButton({
  id: "simple-translate",
  label: "Simple Translate",
  tooltiptext: "Simple Translate",
  onCommand: function () {
    panel.show(button.object);
  },
  onClick: function () {
  }
});

var panel = require("sdk/panel").Panel({
  width: 318,
  height: 205,
  contentURL: data.url("./popup/popup.html"),
  contentScriptFile: [data.url("./popup/popup.js")]
});

exports.storage = {
  read: function (id) {
    return prefs[id] || null;
  },
  write: function (id, data) {
    prefs[id] = data + "";
  }
}

exports.get = function (url) {
  var d = new Promise.defer();
  Request({
    url: url,
    onComplete: function (response) {
      d.resolve(response.text);
    }
  }).get();
  return d.promise;
}

exports.panel = {
  send: function (id, data) {
    panel.port.emit(id, data);
  },
  receive: function (id, callback) {
    panel.port.on(id, callback);
  }
}

exports.window = require('sdk/window/utils').getMostRecentBrowserWindow();
exports.Promise = Promise;