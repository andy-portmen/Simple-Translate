var storage, get, popup, window, Deferred, content_script, tab, contextMenu, version;

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
  contextMenu = firefox.contextMenu;
  version = firefox.version;
  Deferred = firefox.Promise.defer;
}
else {
  storage = _chrome.storage;
  get = _chrome.get;
  popup = _chrome.popup;
  content_script = _chrome.content_script;
  tab = _chrome.tab;
  contextMenu = _chrome.contextMenu;
  version = _chrome.version;
  Deferred = task.Deferred;
}
/********/
if (storage.read("version") != version()) {
  storage.write("version", version());
  tab.open("http://add0n.com/google-translator.html");
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

var autoDetectedLang = 'en';
function getTranslation(word) {
  var definition = '', wordIsCorrect = false, correctedWord = '', detailDefinition = [], sourceLang = '';
  var url = 'http://translate.google.com/translate_a/t?client=p&sl=' + storage.read("from") + '&tl=' + storage.read("to") + 
  '&hl=en&sc=2&ie=UTF-8&oe=UTF-8&uptl=' + storage.read("to") + '&alttl=en&oc=3&otf=2&ssel=0&tsel=0&q=' + encodeURIComponent(word);
  /* Note: (&oc=3&otf=2) is required for spell check */
  var d = new Deferred();
  get(url).then(function (txt) {
    var obj = [];
    try {obj = JSON.parse(txt);} catch(e) {}
    if (!obj.spell || obj.dict) { // if the word is correct (obj.spell) does not exist
      wordIsCorrect = true;
      definition = obj.sentences.reduce(function(p,c){return p + c.trans}, "");
      saveToHistory({
        word: word,
        definition: definition
      });
    } else {correctedWord = obj.spell.spell_res;}
    if (obj.dict) {detailDefinition = obj.dict;}
    if (obj.src)  {sourceLang = obj.src; autoDetectedLang = sourceLang;}   
    var return_obj = {
      word: word, 
      definition: definition,
      sourceLang: sourceLang,
      detailDefinition: detailDefinition,
      wordIsCorrect: wordIsCorrect,
      correctedWord: correctedWord
    }
    d.resolve(return_obj);
  });
  return d.promise;
}

// Message Passing Between Background and Popup
popup.receive("translation-request", function (word) {
  getTranslation(word).then(function (obj) {
    popup.send("translation-response", {
      word: obj.word, 
      definition: obj.definition,
      sourceLang: obj.sourceLang,
      detailDefinition: obj.detailDefinition,
      wordIsCorrect: obj.wordIsCorrect,
      correctedWord: obj.correctedWord
    });
  });
});
popup.receive("change-from-select-request", function (from) {
  storage.write("from", from);
});
popup.receive("change-to-select-request", function (to) {
  storage.write("to", to);
});
popup.receive("toggle-request", function () {
  var from = storage.read("to");
  var to = storage.read("from");
  from = (from == '' ? 'en' : from);
  to = (to == 'auto' ? autoDetectedLang : to);
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
  case 'settings':
    tab.openOptions();
    break;
  case 'define':
    tab.open("https://www.google.com/search?q=define+" + obj.word);
    break;
  }
});
// Message Passing Between Background and Content Script
content_script.receive("translation-request", function (word) {
  getTranslation(word).then(function (obj) {
    content_script.send("translation-response", {
      word: obj.word, 
      definition: obj.definition,
      detailDefinition: obj.detailDefinition
    });
  });
});

content_script.receive("options-request", function () {
  content_script.send("options-response", {
    isTextSelection: storage.read('isTextSelection') == "true",
    isDblclick: storage.read('isDblclick') == "true"
  });
});

contextMenu.create("Define in Google Translate", function () {
  content_script.send("context-menu-request");
});

content_script.receive("context-menu-response", function (word) {
  tab.open("http://translate.google.com/#" + storage.read("from") + "/" + storage.read("to") + "/" + word);
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