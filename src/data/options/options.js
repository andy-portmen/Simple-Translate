var background = {};

/**** wrapper (start) ****/
if (typeof self !== 'undefined' && self.port) { //Firefox
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
}
else if (typeof safari !== 'undefined') { // Safari
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
else {  // Chrome
  background.send = function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  }
  background.receive = function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.method == id) {
        callback(request.data);
      }
    });
  }
}
/**** wrapper (end) ****/

function $ (id) {
  return document.getElementById(id)
};

var from, to, alt, isTextSelection, isDblclick, isTranslateIcon, enableHistory, numberHistoryItems;

background.send("load-storage-from-options", "");
background.send("load-storage-to-options", "");
background.send("load-storage-alt-options", "");
background.send("load-storage-isTextSelection-options", "");
background.send("load-storage-isDblclick-options", "");
background.send("load-storage-isTranslateIcon-options", "");
background.send("load-storage-enableHistory-options", "");
background.send("load-storage-numberHistoryItems-options", "");
background.send("load-readHistory-options", "");

background.receive("load-storage-from-options", function (e) {from = e;});
background.receive("load-storage-to-options", function (e) {to = e;});
background.receive("load-storage-alt-options", function (e) {alt = e;});
background.receive("load-storage-isTextSelection-options", function (e) {isTextSelection = e;});
background.receive("load-storage-isDblclick-options", function (e) {isDblclick = e;});
background.receive("load-storage-isTranslateIcon-options", function (e) {isTranslateIcon = e;});
background.receive("load-storage-enableHistory-options", function (e) {enableHistory = e;});
background.receive("load-storage-numberHistoryItems-options", function (e) {numberHistoryItems = e;});
background.receive("load-readHistory-options", function (e) {
  readHistory = e;
  function loadOptions() {
    var fromSelect = document.getElementById('from-select');
    if (fromSelect) {
      for (var i = 0; i < fromSelect.children.length; i++) {
        if (fromSelect.children[i].getAttribute('value') == from) {
          fromSelect.children[i].selected = 'true';
          break;
        }
      }
    }
    var toSelect = document.getElementById('to-select');
    if (toSelect) {
      for (var i = 0; i < toSelect.children.length; i++) {
        if (toSelect.children[i].getAttribute('value') == to) {
          toSelect.children[i].selected = 'true';
          break;
        }
      }
    }
    var altSelect = document.getElementById('alt-select');
    if (altSelect) {
      for (var i = 0; i < altSelect.children.length; i++) {
        if (altSelect.children[i].getAttribute('value') == alt) {
          altSelect.children[i].selected = 'true';
          break;
        }
      }
    }
    document.getElementsByName('CheckBox1')[0].checked = isTextSelection == 'true';
    document.getElementsByName('CheckBox2')[0].checked = isDblclick == 'true';
    document.getElementsByName('CheckBox2b')[0].checked = isTranslateIcon == 'true';
    document.getElementsByName('CheckBox3')[0].checked = enableHistory == 'true';
    document.getElementsByName('numberHistoryItems')[0].value = parseInt(numberHistoryItems);
    if (enableHistory == 'true') {
      document.getElementsByName('numberHistoryItems')[0].disabled = false;
      clearOptionsHistoryList();
      readHistory.forEach(function (o, i) {
        if (i < parseInt(numberHistoryItems)) {
          var historyList = document.getElementById('historyList');
          var dateSpan = document.createElement('span');
          if (o[2]) dateSpan.style.fontWeight = 'bold';
          var br = document.createElement('br');
          dateSpan.textContent = ' (' + (i + 1) + ') ' + o[0] + ': ' + o[1];
          historyList.appendChild(dateSpan);
          historyList.appendChild(br);
        }
      });
    } else {
      clearOptionsHistory();
      document.getElementsByName('numberHistoryItems')[0].disabled = true;
    }
  }
  loadOptions();

  function clearOptionsHistoryList() {
    var historyList = document.getElementById('historyList');
    while (historyList.firstChild) {
      historyList.removeChild(historyList.firstChild);
    }
  }
  function clearOptionsHistory() {
    background.send("load-clearOptionsHistory-options", "");
    clearOptionsHistoryList();
  }

  // Option Listeners
  document.getElementById('from-select').addEventListener('change', function (e) {
    var fromSelect = e.target.children[e.target.selectedIndex].value;
    background.send("save-from-options", fromSelect);
  }, false);
  document.getElementById('to-select').addEventListener('change', function (e) {
    var toSelect = e.target.children[e.target.selectedIndex].value;
    background.send("save-to-options", toSelect);
  }, false);
  document.getElementById('alt-select').addEventListener('change', function (e) {
    var altSelect = e.target.children[e.target.selectedIndex].value;
    background.send("save-alt-options", altSelect);
  }, false);
  document.getElementById('saveAsHistory').addEventListener('click', function () {
    var data = '';
    readHistory.forEach(function (o, i) {
      if (i < document.getElementsByName('numberHistoryItems')[0].value) {
        data += (i + 1) + ', ' + o[0] + ', ' + o[1] + '\n';
      }
    });
    var encodedUri = encodeURI(data);
    var link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,\uFEFF' + encodedUri);
    link.setAttribute('download', 'dictionary-history.csv');
    document.body.appendChild(link); // append the link to body: required for Firefox
    link.click();
    console.error(link, encodedUri);
  }, false);
  document.getElementById('clearHistory').addEventListener('click', function () {
    clearOptionsHistory();
  }, false);
  document.getElementsByName('CheckBox1')[0].addEventListener('change', function (e) {
    background.send("save-isTextSelection-options", e.target.checked);
    // disable isTranslateIcon options
    document.getElementsByName('CheckBox2b')[0].checked = false;
    background.send("save-isTranslateIcon-options", 'false');
  }, false);
  document.getElementsByName('CheckBox2')[0].addEventListener('change', function (e) {
    background.send("save-isDblclick-options", e.target.checked);
    // disable isTranslateIcon options
    document.getElementsByName('CheckBox2b')[0].checked = false;
    background.send("save-isTranslateIcon-options", 'false');
  }, false);
  document.getElementsByName('CheckBox2b')[0].addEventListener('change', function (e) {
    background.send("save-isTranslateIcon-options", e.target.checked);
    // disable other options
    document.getElementsByName('CheckBox1')[0].checked = false;
    document.getElementsByName('CheckBox2')[0].checked = false;
    background.send("save-isDblclick-options", 'false');
    background.send("save-isTextSelection-options", 'false');
  }, false);
  document.getElementsByName('CheckBox3')[0].addEventListener('change', function (e) {
    background.send("save-enableHistory-options", e.target.checked);
  }, false);
  document.getElementsByName('numberHistoryItems')[0].addEventListener('change', function (e) {
    background.send("save-numberHistoryItems-options", e.target.value);
  }, false);

  $('Settings_Tabs_Translation').setAttribute('active', 'true');
  $('Settings_Tabs_Translation').addEventListener('click', function() {
    $('Settings_Tabs_Translation').setAttribute('active', 'true');
    $('Settings_Tabs_Interface').removeAttribute('active');
    $('Settings_Tabs_General').removeAttribute('active');
    $('tc-1').style.display = 'block';
    $('tc-2').style.display = 'none';
    $('tc-3').style.display = 'none';
  }, false);
  $('Settings_Tabs_Interface').addEventListener('click', function() {
    $('Settings_Tabs_Translation').removeAttribute('active');
    $('Settings_Tabs_Interface').setAttribute('active', 'true');
    $('Settings_Tabs_General').removeAttribute('active');
    $('tc-1').style.display = 'none';
    $('tc-2').style.display = 'block';
    $('tc-3').style.display = 'none';
  }, false);
  $('Settings_Tabs_General').addEventListener('click', function() {
    $('Settings_Tabs_Translation').removeAttribute('active');
    $('Settings_Tabs_Interface').removeAttribute('active');
    $('Settings_Tabs_General').setAttribute('active', 'true');
    $('tc-1').style.display = 'none';
    $('tc-2').style.display = 'none';
    $('tc-3').style.display = 'block';
  }, false);
});
