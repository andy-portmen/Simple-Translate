/* promise and defer */
var Qp = Q.promise;
Qp.defer = Q.defer;
/* ***************** */

var app = {
  Promise: Qp,
  parser: new window.DOMParser(),
  timer: window,

  storage: {
    read: function (id) {
      return localStorage[id] || null;
    },
    write: function (id, data) {
      localStorage[id] = data + "";
    }
  },

  popup: (function () {
    var callbacks = {};
    return {
      send: function (id, obj) {
        safari.extension.popovers[0].contentWindow.background.dispatchMessage(id, obj);
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      },
      dispatchMessage: function (id, obj) {
        if (callbacks[id]) {
          callbacks[id](obj);
        }
      }
    }
  })(),

  tab: {
    open: function (url, inBackground, inCurrent) {
      if (inCurrent) {
        safari.application.activeBrowserWindow.activeTab.url = url;
      }
      else {
        safari.application.activeBrowserWindow.openTab(inBackground ? "background" : "foreground").url = url;
      }
    },
    openOptions: function () {
      var optionsTab = false;
      var tabs = safari.application.activeBrowserWindow.tabs;
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
          if (tab.url && tab.url.indexOf("data/options/options.html") != -1) {
            tab.activate();
            optionsTab = true;
            break;
          }
      }
      if (!optionsTab) safari.application.activeBrowserWindow.openTab().url = safari.extension.baseURI + "data/options/options.html";
    }
  },

  version: function () {
    return safari.extension.displayVersion;
  },

  get: function (url, headers, data) {
    var xhr = new XMLHttpRequest();
    var deferred = new Q.defer();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 400) {
          var e = new Error(xhr.statusText);
          e.status = xhr.status;
          deferred.reject(e);
        }
        else {
          deferred.resolve(xhr.responseText);
        }
      }
    };
    xhr.open(data ? "POST" : "GET", url, true);
    for (var id in headers) {
      xhr.setRequestHeader(id, headers[id]);
    }
    if (data) {
      var arr = [];
      for(e in data) {
        arr.push(e + "=" + data[e]);
      }
      data = arr.join("&");
    }
    xhr.send(data ? data : "");
    return deferred.promise;
  },

  content_script: (function () {
    var callbacks = {};
    safari.application.addEventListener("message", function (e) {
      if (callbacks[e.message.id]) {
        callbacks[e.message.id](e.message.data);
      }
    }, false);
    return {
      send: function (id, data, global) {
        if (global) {
          safari.application.browserWindows.forEach(function (browserWindow) {
            browserWindow.tabs.forEach(function (tab) {
              if (tab.page) tab.page.dispatchMessage(id, data);
            });
          });
        }
        else {
          safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(id, data);
        }
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      }
    }
  })(),

  manifest: {
    url: safari.extension.baseURI
  },

  notification: function (title, text) {
    alert(text);
  },

  play: function (url, callback) {
    var canPlay = false;
    var win = safari.extension.toolbarItems[0].popover.contentWindow;
    try {
      var audio = new win.Audio(); /* use popup window-content to play audio */
      function ended() {
        audio.removeEventListener("ended", ended);
        callback(true);
      }
      audio.addEventListener("ended", ended);
      canPlay = audio.canPlayType("audio/mpeg");
    }
    catch (e) {}
    if (!canPlay) {
      audio = document.createElement("iframe");
      document.body.appendChild(audio);
    }
    if (canPlay) {
      audio.setAttribute("src", url);
      audio.play();
    }
    else {
      audio.removeAttribute('src');
      audio.setAttribute('src', url);
    }
  },

  context_menu: (function () {
    var onPage = [];
    var onSelection = [];
    safari.application.addEventListener("contextmenu", function (e) {
      var selected = e.userInfo && "selectedText" in e.userInfo && e.userInfo.selectedText;
      onPage.forEach(function (arr, i) {
        e.contextMenu.appendContextMenuItem("igtranslator.onPage:" + i, arr[0]);
      });
      if (selected) {
        onSelection.forEach(function (arr, i) {
          e.contextMenu.appendContextMenuItem("igtranslator.onSelection:" + i, arr[0]);
        });
      }
    }, false);
    safari.application.addEventListener("command", function (e) {
      var cmd = e.command;
      if (cmd.indexOf("igtranslator.onPage:") != -1) {
        var i = parseInt(cmd.substr(20));
        onPage[i][1]();
      }
      if (cmd.indexOf("igtranslator.onSelection:") != -1) {
        var i = parseInt(cmd.substr(25));
        onSelection[i][1]();
      }
    }, false);
    return {
      create: function (title, type, callback) {
        if (type == "page") {
          onPage.push([title, callback]);
        }
        if (type == "selection") {
          onSelection.push([title, callback]);
        }
      },
      remove: function () {
        onPage = [];
      }
    }
  })(),

  options: (function () {
    var callbacks = {};
    safari.application.addEventListener("message", function (e) {
      if (callbacks[e.message.id]) {
        callbacks[e.message.id](e.message.data);
      }
    }, false);
    return {
      send: function (id, data) {
        safari.application.browserWindows.forEach(function (browserWindow) {
          browserWindow.tabs.forEach(function (tab) {
            if (tab.page) tab.page.dispatchMessage(id, data);
          });
        });
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      }
    }
  })()
}