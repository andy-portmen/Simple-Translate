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
}
else {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
}
/********/

function $ (id) {
  return document.getElementById(id);
}

$('popupLogo').addEventListener('click', function () {
    background.send("open-options-page", '');
});

function onClick() {
  var word = $("question-input").value;
  if (!word) return;
  var toSelect = $("to-select");
  var value = toSelect.children[toSelect.selectedIndex].getAttribute("value");
  if (!value) {
    $("answer-input").setAttribute("type", "no-language");
    $("answer-input").value = "Select Your Language";
  }
  else {
    background.send("translation-request", word);
  }
  $("question-input").select();
}
$("translate-button").addEventListener("click", onClick, false);
$("question-input").addEventListener("keydown", function (e) {
  $("question-input").removeAttribute("type");
  if (e.keyCode === 13) {
    onClick();
  }
}, false);

// Message Passing Between Background and Popup
background.receive("translation-response", function (obj) {
  if (obj.word.toLowerCase() == obj.definition.toLowerCase()) {
    background.send("correction-request", obj.word);
    $("question-input").setAttribute("type", "corrected");
    $("answer-input").setAttribute("type", "looking-for-alternates");
    $("answer-input").value = "Looking for alternative spelling.";
  }
  else {
    $("question-input").removeAttribute("type");
    $("question-input").value = obj.word;
    $("question-input").select();
    $("answer-input").removeAttribute("type");
    $("answer-input").value = obj.definition;
  }
});
background.receive("correction-response", function (obj) {
  $("question-input").setAttribute("type", "corrected");
  $("question-input").value = obj.word + " >> " + obj.correctedWord;
  $("question-input").select();
  $("answer-input").removeAttribute("type");
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
$("question-input").focus();
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