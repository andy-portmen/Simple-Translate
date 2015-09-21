var app = {
  Promise: Promise,
  
  timer: window,
  
  storage: (function () {
    var objs = {};
    chrome.storage.local.get(null, function (o) {
      objs = o;
      /* store to local storage */
      document.getElementById("common").src = "../common.js";
    });
    return {
      read : function (id) {
        return objs[id];
      },
      write : function (id, data) {
        objs[id] = data;
        var tmp = {};
        tmp[id] = data;
        chrome.storage.local.set(tmp, function () {});
      }
    }
  })(),
  
  get: function (url, headers, data) {
    var xhr = new XMLHttpRequest();
    var deferred = Promise.defer();
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
      chrome.runtime.sendMessage({path: 'background-to-popup', method: id, data: data});
    },
    receive: function (id, callback) {
      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.path == 'popup-to-background') {
          if (request.method == id) {
            callback(request.data);
          }
        }
      });
    }
  },
  
  content_script: {
    send: function (id, data, global) {
      if (global) {
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, {path: 'background-to-page', method: id, data: data}, function () {});
          });
        });
      }
      else {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          tabs.forEach(function (tab) {
            chrome.tabs.sendMessage(tab.id, {path: 'background-to-page', method: id, data: data}, function () {});
          });
        });
      }
    },
    receive: function (id, callback) {
      chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.path == 'page-to-background') {
          if (request.method === id) {
            callback(request.data);
          }
        }
      });
    }
  },
  
  tab: {
    open: function (url) {
      chrome.tabs.create({url: url});
    },
    openOptions: function () {
      var optionsTab = false;
      chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
          var tab = tabs[i];
          if (tab.url.indexOf("data/options/options.html") != -1) {
            chrome.tabs.reload(tab.id, function () {});
            chrome.tabs.update(tab.id, {active: true}, function () {});
            optionsTab = true;
            break;
          }
        }
        if (!optionsTab) chrome.tabs.create({url: "./data/options/options.html"});
      });
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
    },
    remove: function () {
      chrome.contextMenus.removeAll(function () {});
    }
  },
  
  notification: function (title, text) {
    var notification = chrome.notifications.create('', {
      title: title,
      message: text,
      type: "basic",
      iconUrl: chrome.extension.getURL("./") + 'data/icon128.png'
    }, function (e){});
  },
  
  play: function (url, callback) {
    function ended() {
      audio.removeEventListener("ended", ended);
      callback(true);
    }
    var audio = new Audio();
    audio.addEventListener("ended", ended);
    var canPlay = audio.canPlayType("audio/mpeg");
    if (!canPlay) {
      audio = document.createElement("iframe");
      document.body.appendChild(audio);
    }
    if (canPlay) {
      audio.setAttribute('src', url);
      audio.play();
    }
    else {
      audio.removeAttribute('src');
      audio.setAttribute('src', url);
    }
  },
  
  copyToClipboard: function () {},
  
  options: {
    send: function (id, data) {
      chrome.tabs.query({}, function (tabs) {
        tabs.forEach(function (tab) {
          if (tab.url.indexOf("data/options/options.html") !== -1) {
            chrome.tabs.sendMessage(tab.id, {path: 'background-to-options', method: id, data: data}, function () {});
          }
        });
      });
    },
    receive: function (id, callback) {
      chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.path == 'options-to-background') {
          if (request.method === id) {
            callback(request.data);
          }
        }
      });
    }
  },
  
  version: function () {
    return chrome[chrome.runtime && chrome.runtime.getManifest ? "runtime" : "extension"].getManifest().version;
  }
}
