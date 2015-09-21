'use strict';
var self           = require('sdk/self'),
    data           = self.data,
    sp             = require('sdk/simple-prefs'),
    Request        = require('sdk/request').Request,
    prefs          = sp.prefs,
    pageMod        = require('sdk/page-mod'),
    pageWorker     = require('sdk/page-worker'),
    tabs           = require('sdk/tabs'),
    timers         = require('sdk/timers'),
    loader         = require('@loader/options'),
    windowUtils    = require('sdk/window/utils'),
    contextMenu    = require('sdk/context-menu'),
    array          = require('sdk/util/array'),
    unload         = require('sdk/system/unload'),
    notifications  = require('sdk/notifications'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {Cc, Ci, Cu}   = require('chrome'),
    config         = require('../config');
Cu.import('resource://gre/modules/Promise.jsm');

exports.timer = timers;
exports.Promise = Promise;
exports.Deferred = Promise.defer;
exports.window = windowUtils.getMostRecentBrowserWindow();

var button = new ToggleButton({
  id: 'igtranslator',
  label: 'Google™ Translator',
  icon: {
    '16': './icon16.png',
    '32': './icon32.png',
    '64': './icon64.png'
  },
  onChange: function (state) {
    if (state.checked) {
      popup.show({
        position: button
      });
    }
  }
});

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' === 'false') ? (prefs[id] + '') : null;
  },
  write: function (id, data) {
    data = data + '';
    if (data === 'true' || data === 'false') {
      prefs[id] = data === 'true' ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + '';
    }
  }
};

var workers = [], content_script_arr = [];
pageMod.PageMod({ /* page */
  include: ['http://*', 'https://*', 'file:///*', 'about:reader?*'],
  exclude: config.settings.exclude.split(', '),
  contentScriptFile: data.url('content_script/inject.js'),
  contentScriptWhen: 'start',
  contentStyleFile: data.url('content_script/inject.css'),
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

var popup = require('sdk/panel').Panel({
  width: 328,
  height: config.translator.height + 2,
  contentURL: data.url('./popup/popup.html'),
  contentScriptFile: [data.url('./popup/popup.js')],
  onHide: function () {
    button.state('window', {
      checked: false
    });
  }
});

popup.on('show', function() {
  popup.port.emit('show', true);
});

popup.port.on('resize', function(obj) {
  popup.resize(obj.w + 10, obj.h + 10);
});

exports.popup = {
  send: function (id, data) {
    popup.port.emit(id, data);
  },
  receive: function (id, callback) {
    popup.port.on(id, callback);
  }
};

exports.get = function (url, headers, data) {
  var d = new Promise.defer();
  new Request({
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
  })[data ? 'post' : 'get']();
  return d.promise;
};

exports.content_script = {
  send: function (id, data, global) {
    workers.forEach(function (worker) {
      if (!global && worker.tab !== tabs.activeTab) {
        return;
      }
      if (!worker) {
        return;
      }
      worker.port.emit(id, data);
    });
  },
  receive: function (id, callback) {
    content_script_arr.push([id, callback]);
  }
};

exports.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground === 'undefined' ? false : inBackground
      });
    }
  },
  openOptions: function () {
    var optionsTab = false;
    for each (var tab in tabs) {
      if (tab.url.indexOf('dgnibwqga0sibw-at-jetpack/igtranslator') !== -1) {
        tab.reload();            // reload the options tab
        tab.activate();          // activate the options tab
        tab.window.activate();   // activate the options tab window
        optionsTab = true;
      }
    }
    if (!optionsTab) {
      tabs.open(data.url('options/options.html'));
    }
  },
  list: function () {
    var temp = [];
    for each (var tab in tabs) {
      temp.push(tab);
    }
    return Promise.resolve(temp);
  }
};

exports.options = (function () {
  var workers = [], options_arr = [];
  pageMod.PageMod({
    include: data.url('options/options.html'),
    contentScriptFile: data.url('options/options.js'),
    contentScriptWhen: 'start',
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + '/'
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() { array.add(workers, this); });
      worker.on('pagehide', function() { array.remove(workers, this); });
      worker.on('detach', function() { array.remove(workers, this); });
      options_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) {
          return;
        }
        worker.port.emit(id, data);
      });
    },
    receive: (id, callback) => options_arr.push([id, callback])
  };
})();

sp.on('openOptions', function() {
  exports.tab.open(data.url('options/options.html'));
});
unload.when(function () {
  exports.tab.list().then(function (tabs) {
    tabs.forEach(function (tab) {
      if (tab.url === data.url('options/options.html')) {
        tab.close();
      }
    });
  });
});

exports.context_menu = (function () {
  var menuItemSelection, menuItemPage;
  return {
    create: function (title, type, callback) {
      if (type === 'selection') {
        if (menuItemSelection) {
          menuItemSelection.destroy();
        }
        menuItemSelection = contextMenu.Item({
          label: title,
          image: data.url('./icon16.png'),
          context: contextMenu.SelectionContext(),
          contentScript: 'self.on("click", function () {self.postMessage();});',
          onMessage: function () {callback();}
        });
      }
      if (type === 'page') {
        if (menuItemPage) {
          menuItemPage.destroy();
        }
        menuItemPage = contextMenu.Item({
          label: title,
          image: data.url('./icon16.png'),
          context: contextMenu.PageContext(),
          contentScript: 'self.on("click", function () {self.postMessage();});',
          onMessage: function () {callback();}
        });
      }
    },
    remove: function (callback) {
      if (menuItemPage) {
        menuItemPage.destroy();
      }
      if (menuItemSelection) {
        menuItemSelection.destroy();
      }
      callback();
    }
  };
})();

exports.version = function () {
  return self.version;
};

exports.notification = (function () {
  return function (title, text) {
    notifications.notify({
      title: title,
      text: text,
      iconURL: data.url('icon32.png'),
      onClick: function () {
      }
    });
  };
})();

exports.copyToClipboard = function (text) {
  const gClipboardHelper = Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper);
  gClipboardHelper.copyString(text);
  exports.notification('Google™ Translator', 'Selected text is copied to clipboard!');
};

exports.play = function (url, callback) {
  var worker = pageWorker.Page({
    contentScript: "var audio = new Audio('" + url + "'); function ended() {self.postMessage(); audio.removeEventListener('ended', ended);}; audio.addEventListener('ended', ended); audio.volume = 1; audio.play();",
    contentURL: data.url('firefox/sound.html'),
    onMessage: function() {
      worker.destroy();
      callback(true);
    }
  });
};

sp.on('settings', exports.tab.openOptions);
