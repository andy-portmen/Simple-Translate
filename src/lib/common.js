var storage, get, panel, window, Deferred;

/*
Storage Items:
    "history"
    "from"
    "to"
    "textSelection"
    "mouseDoubleClick"
    "enableHistory"
    "numberHistoryItems"
*/

/********/
if (typeof require !== 'undefined') {
  var firefox = require("./firefox.js");
  storage = firefox.storage;
  get = firefox.get;
  panel = firefox.panel;
  window = firefox.window;
  Deferred = firefox.Promise.defer;
}
else {
  storage = _chrome.storage;
  get = _chrome.get;
  panel = _chrome.panel;
  Deferred = task.Deferred;
}
/********/
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
  panel.send("history-update", lStorage_obj);
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
panel.receive("translation-request", function (word) {
  getTranslation(word).then(function (definition) {
    panel.send("translation-response", {word: word, definition: definition});
  });
});
panel.receive("correction-request", function (word) {
  wordCorrection(word).then(function (correctedWord) {
    getTranslation(correctedWord).then(function (definition) {
      panel.send("correction-response", {
        word: word, 
        correctedWord: correctedWord, 
        definition: definition
      });
    });
  });
});
panel.receive("change-from-select-request", function (from) {
  storage.write("from", from);
});
panel.receive("change-to-select-request", function (to) {
  storage.write("to", to);
});
panel.receive("initialization-request", function () {
  panel.send("initialization-response", {
    from: storage.read("from"),
    to: storage.read("to")
  });
  panel.send("history-update", JSON.parse(storage.read("history") || "[]"));
});

// Initialization
if (!storage.read("from")) {
  storage.write("from", "auto");
}
if (!storage.read("textSelection")) {
  storage.write("textSelection", "false");
}
if (!storage.read("mouseDoubleClick")) {
  storage.write("mouseDoubleClick", "true");
}
if (!storage.read("enableHistory")) {
  storage.write("enableHistory", "true");
}
if (!storage.read("numberHistoryItems")) {
  storage.write("numberHistoryItems", "100");
}