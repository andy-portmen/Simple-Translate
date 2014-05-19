var _safari = {
  storage: {
    read: function (id) {
      return localStorage[id] || null;
    },
    write: function (id, data) {
      localStorage[id] = data + "";
    }
  },
  
  get: function (url, headers, data) {
    var xhr = new XMLHttpRequest();
    var deferred = new task.Deferred();
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
  
  popup: (function () {
    var callbacks = {};
    return {
      send: function (id, obj) {
        safari.extension.popovers[0].contentWindow.background.dispatchMessage(id, obj)
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
    open: function (url) {
      safari.application.activeBrowserWindow.openTab().url = url;
    },
    openOptions: function () {
        ///////////////
    }
  },
  
  notification: function (title, text) {
    var notification = webkitNotifications.createNotification(
      safari.extension.baseURI + 'data/icon48.png',  title,  text
    );
    notification.show();
    window.setTimeout(function () {
      notification.cancel();
    }, 5000);
  },
  
  play: (function () {
    var audio = new Audio();
    var canPlay = audio.canPlayType("audio/mpeg");
    if (!canPlay) {
      audio = document.createElement("iframe");
      document.body.appendChild(audio);
    }
    return function (url) {
      if (canPlay) {
        audio.setAttribute("src", url);
        audio.play();
      }
      else {
        audio.removeAttribute('src');
        audio.setAttribute('src', url); 
      }
    }
  })(),
  
  version: function () {
    return safari.extension.displayVersion;
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
  
  context_menu: (function () {
    var onSelection = [];
    var onPage = [];
  
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
      }
    }
  })()
}