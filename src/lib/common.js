var storage, get, popup, window, Deferred, content_script, tab, version;

/*
Storage Items:
    "history"
    "from"
    "to"
    "isTextSelection"
    "isDblclick"
    "enableHistory"
    "numberHistoryItems"
*/

/********/
if (typeof require !== 'undefined') {
  var firefox = require("./firefox.js");
  storage = firefox.storage;
  get = firefox.get;
  popup = firefox.popup;
  window = firefox.window;
  content_script = firefox.content_script;
  tab = firefox.tab;
  version = firefox.version;
  Deferred = firefox.Promise.defer;
}
else {
  storage = _chrome.storage;
  get = _chrome.get;
  popup = _chrome.popup;
  content_script = _chrome.content_script;
  tab = _chrome.tab;
  version = _chrome.version;
  Deferred = task.Deferred;
}
/********/
if (storage.read("version") != version()) {
  storage.write("version", version());
  tab.open("http://add0n.com/simple-translate-chrome.html");
}

function readHistory() {
  var lStorage = storage.read("history") || "[]";
  lStorage_obj = JSON.parse(lStorage); // lStorage to Hash Array
  return lStorage_obj;
}

function saveToHistory(obj) {
  if (!obj.word || !obj.definition) return;
  obj.word = obj.word.toLowerCase();
  obj.definition = obj.definition.toLowerCase();
  if (obj.word == obj.definition) return;
  var numberHistoryItems = parseInt(storage.read("numberHistoryItems"));
  var lStorage_obj = readHistory();
  lStorage_obj = lStorage_obj.filter(function (a) { // Remove duplicate
      return !(a[0] == obj.word && a[1] == obj.definition);
  });
  lStorage_obj.push([obj.word, obj.definition]);
  if (lStorage_obj.length > numberHistoryItems) { // Only store up to the numberHistoryItems items
      lStorage_obj.shift();
  }
  storage.write("history", JSON.stringify(lStorage_obj));
  popup.send("history-update", lStorage_obj);
}

function clearHistory() {
  storage.write("history", "[]");
}

// Word Correction Using Google API
function wordCorrection(word) {
  var d = new Deferred();
  get("http://suggestqueries.google.com/complete/search?client=chrome&q=" +  word).then(function (txt) {
    var correctedWord = '';
    try {
      correctedWord = JSON.parse(txt)[1][0];
    } catch (e) {}
    d.resolve(correctedWord);
  });
  return d.promise;
}

function getTranslation (word) {
  var d = new Deferred();
  get("http://translate.google.com/m?hl=en&sl=" + storage.read("from") + "&tl=" + storage.read("to") + "&ie=UTF-8&prev=_m&q=" + word).then(function (txt) {
    var dom = (new window.DOMParser()).parseFromString(txt, "text/html");
    var definition = "";
    try {
      definition = dom.getElementsByClassName("t0")[0].textContent;
    }
    catch (e) {}
    saveToHistory({
      word: word,
      definition: definition
    });
    d.resolve(definition);
  });
  return d.promise;
}

// Message Passing Between Background and Popup
popup.receive("translation-request", function (word) {
  getTranslation(word).then(function (definition) {
    popup.send("translation-response", {word: word, definition: definition});
  });
});
popup.receive("correction-request", function (word) {
  wordCorrection(word).then(function (correctedWord) {
    getTranslation(correctedWord).then(function (definition) {
      popup.send("correction-response", {
        word: word, 
        correctedWord: correctedWord, 
        definition: definition
      });
    });
  });
});
popup.receive("change-from-select-request", function (from) {
  storage.write("from", from);
});
popup.receive("change-to-select-request", function (to) {
  storage.write("to", to);
});
popup.receive("toggle-request", function (to) {
  var from = storage.read("to");
  var to = storage.read("from");
  from = (from == '' ? 'en' : from);
  to = (to == 'auto' ? 'en' : to);
  storage.write("from", from);
  storage.write("to", to);
  popup.send("initialization-response", {
    from: storage.read("from"),
    to: storage.read("to")
  });
});
popup.receive("initialization-request", function () {
  popup.send("initialization-response", {
    from: storage.read("from"),
    to: storage.read("to")
  });
  popup.send("history-update", JSON.parse(storage.read("history") || "[]"));
});
popup.receive("open-page", function (obj) {
  switch (obj.page) {
  case 'home':
    tab.open("http://translate.google.com/#" + storage.read("from") + "/" + storage.read("to") + "/" + obj.word);
    break;
  case 'settings':
    tab.open("./data/options/options.html");
    break;
  case 'define':
    tab.open("https://www.google.com/search?q=define+" + obj.word);
    break;
  }
});
// Message Passing Between Background and Content Script
content_script.receive("translation-request", function (word) {
  getTranslation(word).then(function (definition) {
    content_script.send("translation-response", {
      word: word, 
      definition: definition
    });
  });
});

content_script.receive("options-request", function () {
  content_script.send("options-response", {
    isTextSelection: storage.read('isTextSelection') == "true",
    isDblclick: storage.read('isDblclick') == "true"
  });
});

// Initialization
if (!storage.read("from")) {
  storage.write("from", "auto");
}
if (!storage.read("isTextSelection")) {
  storage.write("isTextSelection", "false");
}
if (!storage.read("isDblclick")) {
  storage.write("isDblclick", "true");
}
if (!storage.read("enableHistory")) {
  storage.write("enableHistory", "true");
}
if (!storage.read("numberHistoryItems")) {
  storage.write("numberHistoryItems", "100");
}