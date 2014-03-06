/** version 4 **/

// Load Firefox based resources
var self          = require("sdk/self"),
    data          = self.data,
    sp            = require("sdk/simple-prefs"),
    Request       = require("sdk/request").Request,
    prefs         = sp.prefs,
    pageMod       = require("sdk/page-mod"),
    tabs          = require("sdk/tabs"),
    {Cc, Ci, Cu}  = require('chrome');
    
Cu.import("resource://gre/modules/Promise.jsm");
 
// Load overlay styles
require("./userstyles").load(data.url("overlay.css"));
//Install toolbar button
var button = require("./toolbarbutton").ToolbarButton({
  id: "igshortcuts",
  label: "Google Shortcuts",
  tooltiptext: "Shortcuts of Google Products",
  onCommand: function () {
    popup.show(button.object);
  },
  onClick: function () {
  }
});

// Load overlay styles
var workers = [], content_script_arr = [];
pageMod.PageMod({
  include: ["*"],
  contentScriptFile: data.url("./content_script/inject.js"),
  contentStyleFile : data.url("./content_script/inject.css"),
  onAttach: function(worker) {
    workers.push(worker);
    content_script_arr.forEach(function (arr) {
      worker.port.on(arr[0], arr[1]);
    })
  }
});

var popup = require("sdk/panel").Panel({
  width: 260,
  height: 302,
  contentURL: data.url("./popup/popup.html"),
  contentScriptFile: [data.url("./popup/popup.js")]
});

exports.storage = {
  read: function (id) {
    return (prefs[id] + "") || null;
  },
  write: function (id, data) {
    data = data + "";
    if (data === "true" || data === "false") {
      prefs[id] = data === "true" ? true : false;
    }
    else if (parseInt(data) === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + "";
    }
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

exports.popup = {
  send: function (id, data) {
    popup.port.emit(id, data);
  },
  receive: function (id, callback) {
    popup.port.on(id, callback);
  }
}

exports.content_script = {
  send: function (id, data) {
    workers.forEach(function (worker) {
      if (worker.tab != tabs.activeTab) return;
      if (!worker) return;
      worker.port.emit(id, data);
    });
  },
  receive: function (id, callback) {
    content_script_arr.push([id, callback]);
  }
}

exports.tab = {
  open: function (url) {
    tabs.open(url);
  }
}

exports.version = function () {
  return self.version;
}

exports.window = require('sdk/window/utils').getMostRecentBrowserWindow();
exports.Promise = Promise;