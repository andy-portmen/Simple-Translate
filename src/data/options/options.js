var storage = chrome.extension.getBackgroundPage().storage;
var readHistory = chrome.extension.getBackgroundPage().readHistory;
var clearHistory = chrome.extension.getBackgroundPage().clearHistory;
// ------------------------------------------------------------------

function loadOptions() {
  // Initialization
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
  document.getElementsByName('CheckBox1')[0].checked = storage.read('textSelection') == 'true';
  document.getElementsByName('CheckBox2')[0].checked = storage.read('mouseDoubleClick') == 'true';
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
        dateSpan.innerHTML = ' (' + (i + 1) + ') ' + o[0] + ': ' + o[1];
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
  storage.write('textSelection', e.target.checked);
}, false);
document.getElementsByName('CheckBox2')[0].addEventListener('change', function (e) {
  storage.write('mouseDoubleClick', e.target.checked);
}, false);
document.getElementsByName('CheckBox3')[0].addEventListener('change', function (e) {
  storage.write('enableHistory', e.target.checked);
  loadOptions();
}, false);
document.getElementsByName('numberHistoryItems')[0].addEventListener('change', function (e) {
  storage.write('numberHistoryItems', e.target.checked);
  loadOptions();
}, false);
$(window).load(function() {
  loadOptions();
  $('#Settings_Tabs_Translation').addClass('active-tab');
  $(function() {
    $('#Settings_Tabs_Translation').click(function() {
      $('#Settings_Tabs_Translation').addClass('active-tab');
      $('#Settings_Tabs_Interface').removeClass('active-tab');
      $('#Settings_Tabs_General').removeClass('active-tab');
      $('#tc-1').css('display', 'block');
      $('#tc-2').css('display', 'none');
      $('#tc-3').css('display', 'none');
    });
    $('#Settings_Tabs_Interface').click(function() {
      $('#Settings_Tabs_Translation').removeClass('active-tab');
      $('#Settings_Tabs_Interface').addClass('active-tab');
      $('#Settings_Tabs_General').removeClass('active-tab');
      $('#tc-1').css('display', 'none');
      $('#tc-2').css('display', 'block');
      $('#tc-3').css('display', 'none');
    });
    $('#Settings_Tabs_General').click(function() {
      $('#Settings_Tabs_Translation').removeClass('active-tab');
      $('#Settings_Tabs_Interface').removeClass('active-tab');
      $('#Settings_Tabs_General').addClass('active-tab');
      $('#tc-1').css('display', 'none');
      $('#tc-2').css('display', 'none');
      $('#tc-3').css('display', 'block');
    });
  });
});