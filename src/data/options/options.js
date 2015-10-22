var background = {};

/**** wrapper (start) ****/
if (typeof self !== 'undefined' && self.port) { /* Firefox */
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
}
else if (typeof safari !== 'undefined') { /* Safari */
  background.send = function (id, obj) {
    safari.self.tab.dispatchMessage("message", {
      id: id,
      data: obj
    });
  }
  background.receive = (function () {
    var callbacks = {};
    safari.self.addEventListener("message", function (e) {
      if (callbacks[e.name]) {
        callbacks[e.name](e.message);
      }
    }, false);
    return function (id, callback) {
      callbacks[id] = callback;
    }
  })();
  document.addEventListener('contextmenu', function () {
    var selectedText = window.getSelection().toString();
    try {
      safari.self.tab.setContextMenuEventUserInfo(event, {selectedText: selectedText});
    } catch (e) {}
  }, false);
}
else {  /* Chrome */
  background.send = function (id, data) {
    chrome.runtime.sendMessage({path: 'options-to-background', method: id, data: data});
  }
  background.receive = function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.path == 'background-to-options') {
        if (request.method == id) {
          callback(request.data);
        }
      }
    });
  }
}
/**** wrapper (end) ****/

var connect = function (elem, pref) {
  var att = "value";
  if (elem) {
    if (elem.type == "checkbox")    att = "checked";
    if (elem.localName == "select") att = "value";
    if (elem.localName == "span")   att = "textContent";
    var pref = elem.getAttribute("data-pref");
    background.send("get", pref);
    elem.addEventListener("change", function () {
      background.send("changed", {
        pref: pref,
        value: this[att]
      });
    });
  }
  return {
    get value () {      
      return elem[att];
    },
    set value (val) {
      if (elem.type === "file") return;
      if (val == "true") val = true;
      else if (val == "false") val = false;
      elem[att] = val;
    }
  }
}

background.receive("set", function (o) {
  if (window[o.pref]) {
    window[o.pref].value = o.value;
  }
});

function clearOptionsHistoryTable() {
  var table = document.getElementById('translator-history-list');
  var trs = table.getElementsByTagName('tr');
  for (var i = trs.length - 1; i > 0; i--) {
    table.removeChild(trs[i]); /* clear table */
  }
}

function clearOptionsHistory() {
  background.send("clearOptionsHistory", '');
  clearOptionsHistoryTable();
}

function init() {
  /* get DOM elements */
  var selection = document.querySelector("input[data-pref='settings.selection']");
  var dbClick = document.querySelector("input[data-pref='settings.dbClick']");
  var mouseOver = document.querySelector("input[data-pref='settings.mouseOverTranslation']");
  var showIcon = document.querySelector("input[data-pref='settings.showIcon']");
  var enable = document.querySelector("input[data-pref='history.enable']");
  var number = document.querySelector("input[data-pref='history.number']");
  var translateIconShow = document.querySelector("input[data-pref='settings.translateIconShow']");
  var translateIconTime = document.querySelector("input[data-pref='settings.translateIconTime']");
  /* prefs */
  var prefs = document.querySelectorAll("*[data-pref]");
  [].forEach.call(prefs, function (elem) {
    var pref = elem.getAttribute("data-pref");
    window[pref] = connect(elem, pref);
  });
  function set(elm, pref, value) {
    if (!elm) return;
    elm.checked = value;
    background.send("changed", {
      pref: pref,
      value: value
    });
  }
  /* add event listener */
  selection.addEventListener('change', function (e) {
    var flag = e.target.checked;
    set(selection, 'settings.selection', flag);
    set(mouseOver, 'settings.mouseOverTranslation', false);
    set(showIcon, 'settings.showIcon', false);
    translateIconShow.disabled = true;
    translateIconTime.disabled = true;
  }, false);
  dbClick.addEventListener('change', function (e) {
    var flag = e.target.checked;
    set(dbClick, 'settings.dbClick', flag);
    set(mouseOver, 'settings.mouseOverTranslation', false);
    set(showIcon, 'settings.showIcon', false);
    translateIconShow.disabled = true;
    translateIconTime.disabled = true;
  }, false);
  /*
  mouseOver.addEventListener('change', function (e) {
    var flag = e.target.checked;
    set(mouseOver, 'settings.mouseOverTranslation', flag);
    set(selection, 'settings.selection', false);
    set(dbClick, 'settings.dbClick', false);
    set(showIcon, 'settings.showIcon', false);
    translateIconShow.disabled = true;
    translateIconTime.disabled = true;
  }, false);
  */
  showIcon.addEventListener('change', function (e) {
    var flag = e.target.checked;
    translateIconShow.disabled = !flag;
    translateIconTime.disabled = !flag;
    set(showIcon, 'settings.showIcon', flag);
    set(selection, 'settings.selection', false);
    set(dbClick, 'settings.dbClick', false);
    set(mouseOver, 'settings.mouseOverTranslation', false);
  }, false);
  document.getElementById('clearHistory').addEventListener('click', clearOptionsHistory, false);
  enable.addEventListener('click', function (e) {
    var flag = e.target.checked;
    if (!flag) {  
      clearOptionsHistory();
      number.disabled = true;
    }
    else {
      number.disabled = false;
    }
  }, false);
  /* fetch history */
  var dicHistoryData = [];
  function updateOptionsPage(data) {
    dicHistoryData = data;
    var n = window["history.number"].value;
    var e = window["history.enable"].value;
    var table = document.getElementById('translator-history-list');
    function addLine(table, i, word, definition, id) {
      function addColumn(tr, txt, rule, title) {
        var td = document.createElement("td"); 
        td.textContent = txt; 
        td.setAttribute('dir', 'auto'); 
        td.setAttribute('rule', rule); 
        td.setAttribute('title', title);
        if (rule == 'delete') {
          td.addEventListener('click', function (e) {
            var index = parseInt(e.target.parentNode.getAttribute('index'));
            dicHistoryData.splice(index, 1);
            updateOptionsPage(dicHistoryData);
            background.send("set-history-update", dicHistoryData);
          });
        }
        tr.appendChild(td); 
      }
      var tr = document.createElement("tr");
      addColumn(tr, i + 1, 'index', '');
      addColumn(tr, word, 'word', '');
      addColumn(tr, definition, 'definition', '');
      addColumn(tr, '', 'delete', 'Delete Line');
      if (id) tr.style.fontWeight = 'bold';
      tr.setAttribute('index', i);
      table.appendChild(tr);
    }
    if (e || e == 'true') {
      number.disabled = false;
      clearOptionsHistoryTable();
      dicHistoryData.forEach(function (o, i) {
        if (i < n) addLine(table, i, o[0], o[1], o[2]);
      });
    }
    else {
      clearOptionsHistory();
      number.disabled = true;
    }
    if (!showIcon.checked) {
      translateIconShow.disabled = true;
      translateIconTime.disabled = true;
    }
    else {
      translateIconShow.disabled = false;
      translateIconTime.disabled = false;
    }
  }
  background.send("get-history-update");
  background.receive("history-update", updateOptionsPage);

  /* save to history */
  document.getElementById('saveAsHistory').addEventListener('click', function() {
    var csv = '';
    dicHistoryData.forEach(function (o, i) {
      if (i < window["history.number"].value) {
        var column1 = i + 1;
        var column2 = o[0].replace(/\,/g, '').replace(/\u060c/g, '');
        var column3 = o[1].replace(/\,/g, '').replace(/\u060c/g, '');
        csv += column1 + ', ' + column2 + ', ' + column3 + '\n';
      }
    });
    var encodedUri = encodeURI(csv);
    var link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,\uFEFF' + encodedUri);
    link.setAttribute('download', 'dictionary-history.csv');
    document.body.appendChild(link);
    link.click();
  }, false);
  window.removeEventListener("load", init, false);
};
window.addEventListener("load", init, false);