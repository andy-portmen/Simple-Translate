/** version 6 **/

// Load Firefox based resources
var self          = require("sdk/self"),
    data          = self.data,
    sp            = require("sdk/simple-prefs"),
    Request       = require("sdk/request").Request,
    prefs         = sp.prefs,
    pageMod       = require("sdk/page-mod"),
    pageWorker    = require("sdk/page-worker"),
    tabs          = require("sdk/tabs"),
    windowUtils   = require('sdk/window/utils'),
    contextMenu   = require("sdk/context-menu"),
    array         = require('sdk/util/array'),
    {Cc, Ci, Cu}  = require('chrome');
    
Cu.import("resource://gre/modules/Promise.jsm");
 
// Load overlay styles
require("./userstyles").load(data.url("firefox/overlay.css"));
//Install toolbar button
var button = require("./toolbarbutton").ToolbarButton({
  id: "igtranslator",
  label: "Google™ Translator",
  tooltiptext: "Google™ Translator",
  onCommand: function () {
    popup.show(button.object);
  },
  onClick: function () {
  }
});
if (self.loadReason == "install") {
  button.moveTo({
    toolbarID: "nav-bar", 
    insertbefore: "home-button", 
    forceMove: false
  });
}

// Load overlay styles
var workers = [], content_script_arr = [];
pageMod.PageMod({
  include: ["*"],
  contentScriptFile: data.url("./content_script/inject.js"),
  contentScriptWhen: "start",
  contentStyleFile : data.url("./content_script/inject.css"),
  onAttach: function(worker) {
    array.add(workers, worker);
    worker.on('pageshow', function() { array.add(workers, this); });
    worker.on('pagehide', function() { array.remove(workers, this); });
    worker.on('detach', function() { array.remove(workers, this); });
    content_script_arr.forEach(function (arr) {
      worker.port.on(arr[0], arr[1]);
    });
  }
});

var popup = require("sdk/panel").Panel({
  width: 328,
  height: 172,
  contentURL: data.url("./popup/popup.html"),
  contentScriptFile: [data.url("./popup/popup.js")]
});
popup.on('show', function() {
  popup.port.emit('show', true);
});
popup.port.on("resize", function(obj) {
  popup.resize(obj.w + 10, obj.h + 10);
});

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + "" == "false") ? (prefs[id] + "") : null;
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

exports.get = function (url, headers, data) {
  var d = new Promise.defer();
  Request({
    url: url,
    headers: headers || {},
    content: data,
    onComplete: function (response) {
      d.resolve(response.text);
    }
  })[data ? "post" : "get"]();
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
  send: function (id, data, global) {
    workers.forEach(function (worker) {
      if (!global && worker.tab != tabs.activeTab) return;
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
  },
  openOptions: function () {
    windowUtils.getMostRecentBrowserWindow().BrowserOpenAddonsMgr(
      "addons://detail/" + encodeURIComponent(self.id)
    );
  }
}

exports.context_menu = {
  create: function (title, type, callback) {
    var menuItem = contextMenu.Item({
      label: title,
      image: data.url('./icon16.png'),
      context: type == 'selection' ? contextMenu.SelectionContext() : contextMenu.PageContext(),
      contentScript: 'self.on("click", function () {self.postMessage();});',
      onMessage: function () {
        callback();
      }
    });
  }
}

exports.version = function () {
  return self.version;
}

exports.notification = (function () { // https://github.com/fwenzel/copy-shorturl/blob/master/lib/simple-notify.js
  return function (title, text) {
    try {
      let alertServ = Cc["@mozilla.org/alerts-service;1"].
                      getService(Ci.nsIAlertsService);
      alertServ.showAlertNotification(data.url("icon32.png"), title, text, null, null, null, "");
    }
    catch(e) {
      let browser = window.active.gBrowser,
          notificationBox = browser.getNotificationBox();

      notification = notificationBox.appendNotification(text, 'jetpack-notification-box',
          data.url("icon32.png"), notificationBox.PRIORITY_INFO_MEDIUM, []
      );
      timer.setTimeout(function() {
          notification.close();
      }, 5000);
    }
  }
})();

exports.play = function (url) {
  var worker = pageWorker.Page({
    contentScript: "var audio = new Audio('" + url + "'); audio.addEventListener('ended', function () {self.postMessage()}); audio.volume = 1; audio.play();",
    contentURL: data.url("firefox/sound.html"),
    onMessage: function(arr) {
      worker.destroy();
    }
  });
}

exports.window = windowUtils.getMostRecentBrowserWindow();
exports.Promise = Promise;
exports.Deferred = Promise.defer;