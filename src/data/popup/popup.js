/********/
var bg = {};
if (typeof chrome !== 'undefined') {
  bg.send = function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  }
  bg.receive = function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender, callback2) {
      if (request.method == id) {
        callback(request.data);
      }
    });
  }
}
else {
  bg.send = function (id, data) {
    self.port.emit(id, data);
  }
  bg.receive = function (id, callback) {
    self.port.on(id, callback);
  }
}
/********/

function $ (id) {
  return document.getElementById(id);
}

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
    bg.send("translation-request", word);
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

// Listeners
bg.receive("translation-response", function (obj) {
  if (obj.word.toLowerCase() == obj.definition.toLowerCase()) {
    bg.send("correction-request", obj.word);
    $("question-input").setAttribute("type", "corrected");
    $("answer-input").removeAttribute("type");
    $("answer-input").value = "Looking for alternative spelling.";
  }
  else {
    $("question-input").removeAttribute("type");
    $("question-input").value = obj.word;
    $("answer-input").removeAttribute("type");
    $("answer-input").value = obj.definition;
  }
});
bg.receive("correction-response", function (obj) {
  $("question-input").setAttribute("type", "corrected");
  $("question-input").value = obj.word + " >> " + obj.correctedWord;
  $("question-input").select();
  $("answer-input").removeAttribute("type");
  $("answer-input").value = obj.definition;
});
bg.receive("history-update", function (obj) {
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
  bg.send("change-from-select-request", from);
}, false);
$('to-select').addEventListener("change", function (e) {
  var to = e.target.children[e.target.selectedIndex].value;
  bg.send("change-to-select-request", to);
}, false);

// Initialization
$("question-input").focus();
bg.send("initialization-request");
bg.receive("initialization-response", function (obj) {
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