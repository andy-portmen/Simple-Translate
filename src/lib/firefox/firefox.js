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
    {Cc, Ci, Cu}  = require('chrome'),
    windows       = {
      get active () { // Chrome window
        return windowUtils.getMostRecentBrowserWindow()
      }
    },
    isAustralis   = "gCustomizeMode" in windows.active,
    toolbarbutton = isAustralis ? require("./toolbarbutton/new") : require("./toolbarbutton/old");
    
Cu.import("resource://gre/modules/Promise.jsm");
 
// Load overlay styles
require("./userstyles").load(data.url("firefox/overlay.css"));
//Install toolbar button
var button = toolbarbutton.ToolbarButton({
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
      if (response.status >= 400 || response.status < 200) {
        var e = new Error(response.status);
        e.status = response.status;
        d.reject(e);
      } 
      else {
        d.resolve(response.text);
      }
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
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground == 'undefined' ? false : inBackground
      });
    }
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
exports.sp = sp;
exports.prefs = prefs;

sp.on("_alt", function () {
  switch (prefs._alt)
  {
    case 0: prefs.alt = 'af'; break;
    case 1: prefs.alt = 'sq'; break;
    case 2: prefs.alt = 'ar'; break;
    case 3: prefs.alt = 'hy'; break;
    case 4: prefs.alt = 'az'; break;
    case 5: prefs.alt = 'eu'; break;
    case 6: prefs.alt = 'be'; break;
    case 7: prefs.alt = 'bn'; break;
    case 8: prefs.alt = 'bg'; break;
    case 9: prefs.alt = 'ca'; break;
    case 10: prefs.alt = 'ceb'; break;
    case 11: prefs.alt = 'zh-CN'; break;
    case 12: prefs.alt = 'zh-TW'; break;
    case 13: prefs.alt = 'hr'; break;
    case 14: prefs.alt = 'cs'; break;
    case 15: prefs.alt = 'da'; break;
    case 16: prefs.alt = 'nl'; break;
    case 17: prefs.alt = 'en'; break;
    case 18: prefs.alt = 'eo'; break;
    case 19: prefs.alt = 'et'; break;
    case 20: prefs.alt = 'tl'; break;
    case 21: prefs.alt = 'fi'; break;
    case 22: prefs.alt = 'fr'; break;
    case 23: prefs.alt = 'gl'; break;
    case 24: prefs.alt = 'ka'; break;
    case 25: prefs.alt = 'de'; break;
    case 26: prefs.alt = 'el'; break;
    case 27: prefs.alt = 'gu'; break;
    case 28: prefs.alt = 'ht'; break;
    case 29: prefs.alt = 'ha'; break;
    case 30: prefs.alt = 'iw'; break;
    case 31: prefs.alt = 'hi'; break;
    case 32: prefs.alt = 'hmn'; break;
    case 33: prefs.alt = 'hu'; break;
    case 34: prefs.alt = 'is'; break;
    case 35: prefs.alt = 'ig'; break;
    case 36: prefs.alt = 'id'; break;
    case 37: prefs.alt = 'ga'; break;
    case 38: prefs.alt = 'it'; break;
    case 39: prefs.alt = 'ja'; break;
    case 40: prefs.alt = 'jw'; break;
    case 41: prefs.alt = 'kn'; break;
    case 42: prefs.alt = 'km'; break;
    case 43: prefs.alt = 'ko'; break;
    case 44: prefs.alt = 'lo'; break;
    case 45: prefs.alt = 'la'; break;
    case 46: prefs.alt = 'lv'; break;
    case 47: prefs.alt = 'lt'; break;
    case 48: prefs.alt = 'mk'; break;
    case 49: prefs.alt = 'ms'; break;
    case 50: prefs.alt = 'mt'; break;
    case 51: prefs.alt = 'mi'; break;
    case 52: prefs.alt = 'mr'; break;
    case 53: prefs.alt = 'mn'; break;
    case 54: prefs.alt = 'ne'; break;
    case 55: prefs.alt = 'no'; break;
    case 56: prefs.alt = 'fa'; break;
    case 57: prefs.alt = 'pl'; break;
    case 58: prefs.alt = 'pt'; break;
    case 59: prefs.alt = 'pa'; break;
    case 60: prefs.alt = 'ro'; break;
    case 61: prefs.alt = 'ru'; break;
    case 62: prefs.alt = 'sr'; break;
    case 63: prefs.alt = 'sk'; break;
    case 64: prefs.alt = 'sl'; break;
    case 65: prefs.alt = 'so'; break;
    case 66: prefs.alt = 'es'; break;
    case 67: prefs.alt = 'sw'; break;
    case 68: prefs.alt = 'sv'; break;
    case 69: prefs.alt = 'ta'; break;
    case 70: prefs.alt = 'te'; break;
    case 71: prefs.alt = 'th'; break;
    case 72: prefs.alt = 'tr'; break;
    case 73: prefs.alt = 'uk'; break;
    case 74: prefs.alt = 'ur'; break;
    case 75: prefs.alt = 'vi'; break;
    case 76: prefs.alt = 'cy'; break;
    case 77: prefs.alt = 'yi'; break;
    case 78: prefs.alt = 'yo'; break;
    case 79: prefs.alt = 'zu'; break;
    default: prefs.alt = 'en'; break;
  }
});