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
        if (xhr.status >= 400 || xhr.status < 200) {
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
  context_menu: {
    create: function (title, type, callback) {  //type: selection, page
      chrome.contextMenus.create({
        "title": title, 
        "contexts": [type], 
        "onclick": function () {
          callback();
        }
      });
    }
  },
  
  notification: function (title, text) {
    var notification = webkitNotifications.createNotification(
      chrome.extension.getURL("./") + 'data/icon48.png',  title,  text
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
    return chrome[chrome.runtime && chrome.runtime.getManifest ? "runtime" : "extension"].getManifest().version;
  }
}