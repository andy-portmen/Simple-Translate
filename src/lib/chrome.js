/** version 4 **/

var _chrome = {
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
    if (headers) {
      headers.forEach(function (header) {
        xhr.setRequestHeader(header[0], header[1]);
      });
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
  popup: {
    send: function (id, data) {
      chrome.extension.sendRequest({method: id, data: data});
    },
    receive: function (id, callback) {
      chrome.extension.onRequest.addListener(function(request, sender, callback2) {
        if (request.method == id && !sender.tab) {
          callback(request.data);
        }
      });
    }
  },
  content_script: {
    send: function (id, data, global) {
      var options = global ? {} : {active: true, currentWindow: true}
      chrome.tabs.query(options, function(tabs) {
        tabs.forEach(function (tab) {
          chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function() {}); 
        });
      });
    },
    receive: function (id, callback) {
      chrome.extension.onRequest.addListener(function(request, sender, callback2) {
        if (request.method == id && sender.tab) {
          callback(request.data);
        }
      });
    }
  },
  tab: {
    open: function (url) {
      chrome.tabs.create({url: url});
    },
    openOptions: function () {
      chrome.tabs.create({url: "./data/options/options.html"});
    }
  },
  contextMenu: {
    create: function (title, callback) {
      chrome.contextMenus.create({
        "title": title, 
        "contexts": ["selection"], 
        "onclick": function () {
          callback();
        }
      });
    }
  },
  
  notification: function (title, text) {
    var notification = webkitNotifications.createNotification(
      'notification.png',  title,  text
    );
    notification.show();
    window.setTimeout(function () {
      notification.cancel();
    }, 5000);
  },

  version: function () {
    return chrome[chrome.runtime && chrome.runtime.getManifest ? "runtime" : "extension"].getManifest().version;
  }
}