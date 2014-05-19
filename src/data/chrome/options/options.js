var storage = chrome.extension.getBackgroundPage().storage;
var readHistory = chrome.extension.getBackgroundPage().readHistory;
var clearHistory = chrome.extension.getBackgroundPage().clearHistory;
// ------------------------------------------------------------------

// background.receive("loadOptions", loadOptions());

function $ (id) {
  return document.getElementById(id)
};

function loadOptions() {
  var fromSelect = document.getElementById('from-select');
  for (var i = 0; i < fromSelect.children.length; i++) {
    if (fromSelect.children[i].getAttribute('value') == storage.read('from')) {
      fromSelect.children[i].selected = 'true';
      break;
    }
  }
  var toSelect = document.getElementById('to-select');
  for (var i = 0; i < toSelect.children.length; i++) {
    if (toSelect.children[i].getAttribute('value') == storage.read('to')) {
      toSelect.children[i].selected = 'true';
      break;
    }
  }
  document.getElementsByName('CheckBox1')[0].checked = storage.read('isTextSelection') == 'true';
  document.getElementsByName('CheckBox2')[0].checked = storage.read('isDblclick') == 'true';
  document.getElementsByName('CheckBox3')[0].checked = storage.read('enableHistory') == 'true';
  document.getElementsByName('numberHistoryItems')[0].value = parseInt(storage.read('numberHistoryItems'));
  if (storage.read('enableHistory') == 'true') {
    document.getElementsByName('numberHistoryItems')[0].disabled = false;
    clearOptionsHistoryList();
    readHistory().forEach(function (o, i) {
      if (i < parseInt(storage.read('numberHistoryItems'))) {
        var historyList = document.getElementById('historyList');
        var dateSpan = document.createElement('span');
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
function clearOptionsHistoryList() {
  var historyList = document.getElementById('historyList');
  while (historyList.firstChild) {
    historyList.removeChild(historyList.firstChild);
  }
}
function clearOptionsHistory() {
  clearHistory();
  clearOptionsHistoryList();
}

// Option Listeners
document.getElementById('from-select').addEventListener('change', function (e) {
  var from = e.target.children[e.target.selectedIndex].value;
  storage.write('from', from);
}, false);
document.getElementById('to-select').addEventListener('change', function (e) {
  var to = e.target.children[e.target.selectedIndex].value;
  storage.write('to', to);
}, false);
document.getElementById('saveAsHistory').addEventListener('click', function () {
  var data = '';
  readHistory().forEach(function (o, i) {
    if (i < document.getElementsByName('numberHistoryItems')[0].value) {
      data += (i + 1) + ', ' + o[0] + ', ' + o[1] + '\n';
    }
  });
  var encodedUri = encodeURI(data);
  var link = document.createElement('a');
  link.setAttribute('href', 'data:text/csv;charset=utf-8,\uFEFF' + encodedUri);
  link.setAttribute('download','dicHistory.csv');
  link.click();
}, false);
document.getElementById('clearHistory').addEventListener('click', function () {
  clearOptionsHistory();
}, false);
document.getElementsByName('CheckBox1')[0].addEventListener('change', function (e) {
  storage.write('isTextSelection', e.target.checked);
}, false);
document.getElementsByName('CheckBox2')[0].addEventListener('change', function (e) {
  storage.write('isDblclick', e.target.checked);
}, false);
document.getElementsByName('CheckBox3')[0].addEventListener('change', function (e) {
  storage.write('enableHistory', e.target.checked);
  loadOptions();
}, false);
document.getElementsByName('numberHistoryItems')[0].addEventListener('change', function (e) {
  storage.write('numberHistoryItems', e.target.value);
  loadOptions();
}, false);

window.onload = function() {
  loadOptions();
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
};