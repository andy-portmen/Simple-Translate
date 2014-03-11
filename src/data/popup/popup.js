/********/
var background = {};
if (typeof chrome !== 'undefined') {
  background.send = function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  }
  background.receive = function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender, callback2) {
      if (request.method == id) {
        callback(request.data);
      }
    });
  }
  $("question-input").focus();
}
else {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  self.port.on("show", function () {
    $("question-input").focus();
  });
}
/********/

function $ (id) {
  return document.getElementById(id);
}

$('fromto-span').addEventListener('click', function () {
    background.send("toggle-request");
}, false);

$('home-td').addEventListener('click', function () {
    background.send("open-page", {
      page: 'home', 
      word: $("question-input").value.split(">>")[0]
    });
}, false);

$('settings-td').addEventListener('click', function () {
    background.send("open-page", {
     page: 'settings'
   });
}, false);

$('define-td').addEventListener('click', function () {
    background.send("open-page", {
      page: 'define', 
      word: $("question-input").value.split(">>")[0]
    });
}, false);

function onClick() {
  var word = $("question-input").value;
  if (!word) return;
  var toSelect = $("to-select");
  var value = toSelect.children[toSelect.selectedIndex].getAttribute("value");
  if (!value) {
    $("answer-input").value = "Select Your Language!";
  }
  else {
    background.send("translation-request", word);
    $("answer-input").value = "...";
  }
  $("question-input").select();
}
$("translate-span").addEventListener("click", onClick, false);
$("question-input").addEventListener("keydown", function (e) {
  if (e.keyCode === 13) {
    onClick();
  }
}, false);

// Message Passing Between Background and Popup
background.receive("translation-response", function (obj) {
  if (obj.word.toLowerCase() == obj.definition.toLowerCase()) {
    background.send("correction-request", obj.word);
    $("answer-input").value = "Looking for alternative spelling.";
  }
  else {
    $("question-input").value = obj.word;
    $("question-input").select();
    $("answer-input").value = obj.definition;
  }
});
background.receive("correction-response", function (obj) {
  $("question-input").value = obj.word + " >> " + obj.correctedWord;
  $("question-input").select();
  $("answer-input").value = obj.definition;
});
background.receive("history-update", function (obj) {
  var historySelect = $("history-select");
  while (historySelect.firstChild) { // Remove history from drop-down list
    historySelect.removeChild(historySelect.firstChild);
  }
  function addNewItem(word, definition) {
    var option = document.createElement("option");
    option.textContent = word + ": " + definition;
    option.setAttribute("value", word);
    historySelect.appendChild(option);
  }
  obj.reverse().forEach(function (o, i) { // Store 10 items in pop-up list
    if (i < 10) {
      addNewItem(o[0], o[1]);
    }
  });
  if (!obj.length) { // If the list is empty
    var option = document.createElement("option");
    option.textContent = "empty";
    option.setAttribute("disabled", true);
    historySelect.appendChild(option);
  }
});

$('from-select').addEventListener("change", function (e) {
  var from = e.target.children[e.target.selectedIndex].value;
  background.send("change-from-select-request", from);
}, false);
$('to-select').addEventListener("change", function (e) {
  var to = e.target.children[e.target.selectedIndex].value;
  background.send("change-to-select-request", to);
}, false);

// Initialization
background.send("initialization-request");
background.receive("initialization-response", function (obj) {
  var fromSelect = $("from-select");
  for (var i = 0; i < fromSelect.children.length; i++) {
    if (fromSelect.children[i].getAttribute("value") == obj.from) {
      fromSelect.children[i].selected = "true";
      break;
    }
  }
  var toSelect = $("to-select");
  for (var i = 0; i < toSelect.children.length; i++) {
    if (toSelect.children[i].getAttribute("value") == obj.to) {
      toSelect.children[i].selected = "true";
      break;
    }
  }
});