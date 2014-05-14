/** version 6 **/

// Load Firefox based resources
var self          = require("sdk/self"),
    data          = self.data,
    sp            = require("sdk/simple-prefs"),
    Request       = require("sdk/request").Request,
    prefs         = sp.prefs,
    pageMod       = require("sdk/page-mod"),
    tabs          = require("sdk/tabs"),
    windowUtils   = require('sdk/window/utils'),
    contextMenu   = require("sdk/context-menu"),
    {Cc, Ci, Cu}  = require('chrome');
    
Cu.import("resource://gre/modules/Promise.jsm");
 
// Load overlay styles
require("./userstyles").load(data.url("overlay.css"));
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
  contentStyleFile : data.url("./content_script/inject.css"),
  onAttach: function(worker) {
    workers.push(worker);
    content_script_arr.forEach(function (arr) {
      worker.port.on(arr[0], arr[1]);
    });
    worker.on('detach', function(){
      var i = workers.indexOf(worker);
      if (i != -1) {
        workers.splice(i, 1);
      }
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

exports.get = function (url, data) {
  var d = new Promise.defer();
  Request({
    url: url,
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

exports.contextMenu = {
  create: function (title, callback) {
    var menuItem = contextMenu.Item({
      label: title,
      image: data.url('./icon16.png'),
      context: contextMenu.SelectionContext(),
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

exports.window = windowUtils.getMostRecentBrowserWindow();
exports.Promise = Promise;