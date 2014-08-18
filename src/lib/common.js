var storage, get, popup, window, Deferred, content_script, tab, context_menu, notification, version, play, sp, prefs;

/**** wrapper (start) ****/
if (typeof require !== 'undefined') { //Firefox
  var firefox = require("./firefox/firefox");
  ["storage", "notification", "get", "popup", "window", "content_script", "tab", "context_menu", "version", "play", "Deferred", "sp", "prefs"].forEach(function (id) {
    this[id] = firefox[id];
  });
  // Message Passing Between Background and Options (for Firefox)
  sp.on("isTranslateIcon", function () {
    if (prefs.isTranslateIcon) {
      prefs.isDblclick = false;
      prefs.isTextSelection = false;
      sendOptions();
    }
  });

  sp.on("isDblclick", function () {
    if (prefs.isDblclick) {
      prefs.isTranslateIcon = false;
      sendOptions();
    }
  });

  sp.on("isTextSelection", function () {
    if (prefs.isTextSelection) {
      prefs.isTranslateIcon = false;
      sendOptions();
    }
  });
}
else if (typeof safari !== 'undefined') {  // Safari
  ["storage", "notification", "get", "popup", "content_script", "tab", "context_menu", "version", "play"].forEach(function (id) {
    this[id] = _safari[id];
  });
  Deferred = task.Deferred;
}
else {  //Chrome
  ["storage", "notification", "get", "popup", "content_script", "tab", "context_menu", "version", "play"].forEach(function (id) {
    this[id] = _chrome[id];
  });
  Deferred = task.Deferred;
}
/**** wrapper (end) ****/

var sourceLanguage, autoDetectedLang = 'en';
const LANGS = ["az","eu","be","bn","bg","ceb","et","tl","gl","ka","gu","ha","iw","hmn","ig","ga","jw","kn","km","lo","lt","ms","mt","mi","mr","mn","ne","fa","pa","sl","so","te","uk","ur","yi","yo","zu"];

function parallel (arr) {
  var d = new Deferred(), results = [], stage = arr.length;
  function next (succeed, i, result) {
    results[i] = result;
    stage -= 1;
    if (!succeed) d.reject(result);
    if (!stage) d.resolve(results);
  }
  arr.forEach(function (e, i) {
    return e.then(next.bind(this, true, i), next.bind(this, false, i));
  });
  return d.promise;
}

function m (i) {
  var arr = [
    "ossw=((fcc7i)dhj(`hh`kb*sufitkfshu)osjk8qbutnhi:",
    'ossw=((sufitkfsb)`hh`kb)dhj(sufitkfsbXf(s8dknbis:w!tk:',
    "osswt=((sufitkfsb)`hh`kb)dhj($",
    'osswt=((sufitkfsb)`hh`kb)dhj(sufitkfsbXsst8nb:RSA*?!v:',
    'osswt=((sufitkfsb)`hh`kb)dhj(sufitkfsbXf(t`8dknbis:s!dj:',
    'osswt=((sufitkfsb)`hh`kb)dhj(sufitkfsb8wubq:Xs!ok:bi!nb:RSA*?!r:',
    'osswt=((sufitkfsb)`hh`kb)dhj(sufitkfsbXf(tni`kb8dknbis:s!tk:'
  ];
  var str = arr[i];
  return str.split("").map(function (c) {return c.charCodeAt(0)}).map(function (i){return i ^ 7}).map(function (i){return String.fromCharCode(i)}).join("")
}

if (storage.read("version") != version()) {
  storage.write("version", version());
  tab.open(m(0) + version());
}

function readHistory() {
  var lStorage = storage.read("history") || "[]";
  var lStorage_obj = JSON.parse(lStorage);
  return lStorage_obj;
}

function findPhrasebook(word, definition) {
  var lStorage_obj = readHistory();
  var phrasebook = "";
  if (word && definition) {
    phrasebook = lStorage_obj.filter(function (a) {
      return (a[0].toLowerCase() == word.toLowerCase() && a[1].toLowerCase() == definition.toLowerCase())
    })[0];
  }
  return phrasebook ? phrasebook[2] : "";
}

function saveToHistory(obj) {
  if (!obj.word || !obj.definition) return;
  obj.word = obj.word.toLowerCase();
  obj.definition = obj.definition.toLowerCase();
  if (obj.word == obj.definition) return;
  var numberHistoryItems = parseInt(storage.read("numberHistoryItems"));
  var lStorage_obj = readHistory();

  var tmpPhrasebook;
  lStorage_obj = lStorage_obj.filter(function (a) { // Remove item if it is in the list
    if (a[0].toLowerCase() == obj.word && a[1].toLowerCase() == obj.definition) {
      tmpPhrasebook = a[2];
      return false;
    }
    else return true;
  });
  lStorage_obj.push([obj.word, obj.definition, "phrasebook" in obj ? obj.phrasebook : tmpPhrasebook || ""]);
  if (lStorage_obj.length > numberHistoryItems) { // Only store up to the numberHistoryItems items
      lStorage_obj.shift();
  }
  storage.write("history", JSON.stringify(lStorage_obj));
  popup.send("history-update", lStorage_obj);
}

function clearHistory() {
  storage.write("history", "[]");
}

function newTranslationEngine(inputWord, ajaxResults) {
  var obj = {};
  obj.error = true;
  if (ajaxResults[0]) {
    var result = ajaxResults[0];
    var result_simplified = result.replace(/\,{2}/g, ',null,').replace(/\,{2}/g, ',null,').replace(/\[\,/g, "[null,");
    if (result_simplified) {
      var arr = [];
      try {
        arr = JSON.parse(result_simplified);
      } 
      catch(e) {}
      if (arr) {
        var sourceLang = '', src1 = '', src2 = '';
        if (arr[2]) src1 = arr[2];
        if (arr[8] && arr[8][0] && arr[8][0][0]) src2 = arr[8][0][0];
        if (src1) sourceLang = src1;
        else if (src2) sourceLang = src2;
        obj.sourceLang = sourceLang;
        autoDetectedLang = sourceLang;
        if (sourceLang == storage.read("to")) {
          var result = ajaxResults[1];
          var result_simplified = replace(/\,{2}/g, ',null,').replace(/\,{2}/g, ',null,').replace(/\[\,/g, "[null,");
          if (result_simplified) {
            try {
              arr = JSON.parse(result_simplified);
            } 
            catch(e) {}
          }
        }
        if (arr) {
          if (arr[0] && arr[0][0]) {
            if (arr[0][0][0] && arr[0][0][1]) {
              obj.word = inputWord; // you can also use: arr[0][0][1]
              obj.definition = arr[0][0][0];
              obj.error = false;
            }
          }
          if (arr[1]) {
            var elm = arr[1];
            var detailDefinition = [];
            for (var i = 0; i < elm.length; i++) {
              var entry = [];
              var pos = elm[i][0];
              for (var k = 0; k < elm[i][2].length; k++) {
                var word = elm[i][2][k][0];
                var reverse_translation = elm[i][2][k][1];
                var score = elm[i][2][k][3];
                var line = {
                  word: word,
                  reverse_translation: reverse_translation,
                  score: score
                }
                entry.push(line);
              }
              detailDefinition.push({
                pos: pos,
                entry: entry
              })
            }
            obj.detailDefinition = detailDefinition;
          }
          if (arr[4] && arr[4][0] && arr[4][0][0]) {
            obj.definition_backup = arr[4][0][0];
          }
          if (arr[5] && arr[5][0] && arr[5][0][0]) {
            obj.word_backup = arr[5][0][0];
          }
          obj.wordIsCorrect = true;
          obj.correctedWord = '';
          if (arr[7] && arr[7][0]) { // arr[7] is for spell-check
            obj.wordIsCorrect = false;
            obj.correctedWord = arr[7][1];
          }
          if (arr[11]) {
            var elm = arr[11];
            var synonyms = [];
            for (var i = 0; i < elm.length; i++) {
              var entry = [];
              var pos = elm[i][0];
              for (var k = 0; k < elm[i][1].length; k++) {
                entry.push(elm[i][1][k][0]);
              }
              synonyms.push({
                pos: pos,
                entry: entry
              })
            }
            obj.synonyms = synonyms;
          }
          if (arr[14] && arr[14][0]) {
            obj.similar_words = arr[14][0];
          }
        }
      }
    }
  }
  return obj;
}

function oldTranslationEngine(inputWord, ajaxResults) { /* Note: (&oc=3&otf=2) is required for spell check  */
  var obj = {}, definition = '', wordIsCorrect = false, correctedWord = '', detailDefinition = [], sourceLang = '', error = true;
  try {
    obj = JSON.parse(ajaxResults[0]);
  } 
  catch(e) {}
  if (obj.src) {
    sourceLang = obj.src; 
    autoDetectedLang = obj.src;
  }
  if (sourceLang == storage.read("to")) {
    try {
      obj = JSON.parse(ajaxResults[1]);
    } 
    catch(e) {}
  }
  // check to see if the input Word is correct with 3 conditions
  var cnd1 = !obj.spell || (obj.spell && obj.spell.spell_res == inputWord.toLowerCase());
  var cnd2 = obj.spell && obj.spell.spell_res.replace(/[\-]/g,'') == inputWord.toLowerCase();
  var cnd3 = obj.dict || obj.sentences;
  if ((cnd1 || cnd2) && cnd3) {
    wordIsCorrect = true;
    definition = obj.sentences.reduce(function(p,c) {return p + c.trans}, "");
  }
  else {
    correctedWord = obj.spell.spell_res;
  }
  if (obj.dict) detailDefinition = obj.dict;
  if (inputWord && definition && sourceLang) error = false;
  var result = {
    word: inputWord,
    definition: definition,
    sourceLang: sourceLang,
    detailDefinition: detailDefinition,
    wordIsCorrect: wordIsCorrect,
    correctedWord: correctedWord,
    error: error
  };
  return result;
}

function getTranslation(word) {
  word = word.trim();
  word = word.toLowerCase();
  // urls for old engine
  var url_old_1 = m(1) + storage.read("from") + '&tl=' + storage.read("to") + '&hl=en&sc=2&ie=UTF-8&oe=UTF-8&uptl=' + storage.read("to") + '&alttl=en&oc=3&otf=2&ssel=0&tsel=0&q=' + word;
  var url_old_2 = m(1) + storage.read("from") + '&tl=' + storage.read("alt") + '&hl=en&sc=2&ie=UTF-8&oe=UTF-8&uptl=' + storage.read("alt") + '&alttl=en&oc=3&otf=2&ssel=0&tsel=0&q=' + word;
  // urls for new engine
  var url_new_1 = m(6) + storage.read("from") + '&tl=' + storage.read("to") + '&hl=en&dt=bd&dt=ex&dt=ld&dt=md&dt=qc&dt=rw&dt=rm&dt=ss&dt=t&dt=at&dt=sw&ie=UTF-8&oe=UTF-8&ssel=0&tsel=0&q=' + word;
  var url_new_2 = m(6) + storage.read("from") + '&tl=' + storage.read("alt") + '&hl=en&dt=bd&dt=ex&dt=ld&dt=md&dt=qc&dt=rw&dt=rm&dt=ss&dt=t&dt=at&dt=sw&ie=UTF-8&oe=UTF-8&ssel=0&tsel=0&q=' + word;
  // ajax request
  var d = new Deferred();
  parallel([get(url_new_1), get(url_new_2)]).then(function (results) {
    var obj = newTranslationEngine(word, results);                // use with new urls
    sourceLanguage = obj.sourceLang;                              // adding source language
    obj.phrasebook = findPhrasebook(obj.word, obj.definition);    // add phrasebook to obj
    obj.isVoice = LANGS.indexOf(storage.read("from")) == -1;      // add isVoice to obj
    if (!obj.error && obj.wordIsCorrect) { // save to history in case input word is correct
      saveToHistory({
        word: obj.word,
        definition: obj.definition
      });
    }
    d.resolve(obj);
  }, function (e) {    
    d.resolve({
      word: '',
      definition: '',
      sourceLang: '',
      detailDefinition: '',
      wordIsCorrect: '',
      correctedWord: '',
      error: e
    });
  });
  return d.promise;
}

// Message Passing Between Background and Popup
popup.receive("translation-request", function (word) {
  getTranslation(word).then(function (obj) {
    popup.send("translation-response", obj);
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

function openPage(obj) {
  switch (obj.page) {
  case 'settings':
    tab.openOptions();
    break;
  case 'define':
    tab.open(m(2) + storage.read("from") + "/" + storage.read("to") + "/" + obj.word);
    break;
  }
}
popup.receive("open-page", openPage);
content_script.receive("open-page", openPage);

function playVoice(data) {
  // Content script does not return lang
  data.lang = data.lang || storage.read("from");
  data.lang = (data.lang == 'auto' ? autoDetectedLang : data.lang);

  var url = m(3) + data.word + '&tl=' + data.lang + '&total=1&textlen=' + data.word.length + '&client=t';
  play(url);
}
popup.receive("play-voice", playVoice);
popup.receive("check-voice-request", function () {
  popup.send(
    "check-voice-response",
    LANGS
  );
});

var bookmark = {
  server: function (question, answer, action, id) {
    var d = new Deferred();
    var from = storage.read("from");
    if (from == "auto") {
      from = sourceLanguage || "en";
    }
    var to = storage.read("to");
    get(m(2) + from + "/" + to + "/ok").then(function (content) {
      var usage = /USAGE\=\'([^\'\ ]*)\'/.exec(content);
      if (usage && usage.length) {
        usage = usage[1];
        var url = m(4) + action + "&sl=" + from + "&tl=" + to + "&ql=3&hl=en&xt=" + usage;
        get(
          url,
          {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
          action == "a" ? {q: question, utrans: answer} : {id: id}
        ).then (
          function (content) {
            var key = /\"([^\"]*)\"\]/.exec(content);
            if (key && key.length) {
              d.resolve(key[1]);
            }
            else {
              d.reject({message: "no-key"});
            }
          },
          d.reject
        );
      }
    });
    return d.promise;
  },
  onSuccess: function (data, key) {
    saveToHistory({
      word: data.question,
      definition: data.answer,
      phrasebook: key
    });
  },
  onReject: function (e) {
    if (e.message == "Unauthorized") {
      notification("Google Translator", "Please sign-in to your Google account first.");
    }
    if (e.message == "no-key") {
      notification("Google Translator", "Internal error. Are you logged-in?");
    }
  }
}

popup.receive("add-to-phrasebook", function (data) {
  bookmark.server(data.question, data.answer, "a").then(
    function (key) {
      popup.send("saved-to-phrasebook");
      bookmark.onSuccess(data, key);
    },
    function (e) {
      popup.send("failed-phrasebook", "");
      bookmark.onReject(e);
    }
  );
});

popup.receive("remove-from-phrasebook", function (data) {
  var id = findPhrasebook(data.question, data.answer);
  if (!id) return;

  bookmark.server(data.question, data.answer, "d", id).then(
    function () {
      popup.send("removed-from-phrasebook");
      bookmark.onSuccess(data, "");
    },
    function (e) {
      popup.send("failed-phrasebook", "saved");
      bookmark.onReject(e);
    }
  );
});

// Message Passing Between Background and Content Script
content_script.receive("translation-request", function (word) {
  getTranslation(word).then(function (obj) {
    content_script.send("translation-response", obj);
  });
});

function sendOptions() {
  content_script.send("options-response", {
    isTextSelection: storage.read('isTextSelection') == "true",
    isDblclick: storage.read('isDblclick') == "true",
    isTranslateIcon: storage.read('isTranslateIcon') == "true"
  }, true); // true: send to all tabs
}
content_script.receive("options-request", sendOptions);

context_menu.create("Define in Google Translate", "selection", function () {
  content_script.send("context-menu-word-request");
});

content_script.receive("context-menu-word-response", function (word) {
  tab.open(m(2) + storage.read("from") + "/" + storage.read("to") + "/" + word);
});

context_menu.create("Translate page in Google Translate", "page", function () {
  content_script.send("context-menu-url-request");
});

content_script.receive("context-menu-url-response", function (url) {
  var from = storage.read("from");
  var to = storage.read("to");
  url = m(5) + url + "&sl=" + from + "&tl=" + to
  tab.open(url);
});

content_script.receive("add-to-phrasebook", function (data) {
  bookmark.server(data.question, data.answer, "a").then(
    function (key) {
      content_script.send("saved-to-phrasebook");
      bookmark.onSuccess(data, key);
    },
    function (e) {
      content_script.send("failed-phrasebook", "");
      bookmark.onReject(e);
    }
  );
});

content_script.receive("remove-from-phrasebook", function (data) {
  var id = findPhrasebook(data.question, data.answer);
  if (!id) return;

  bookmark.server(data.question, data.answer, "d", id).then(
    function () {
      content_script.send("removed-from-phrasebook");
      bookmark.onSuccess(data, "");
    },
    function (e) {
      content_script.send("failed-phrasebook", "saved");
      bookmark.onReject(e);
    }
  );
});

content_script.receive("play-voice", playVoice);

// Message Passing Between Background and Options
content_script.receive("load-storage-from-options", function () {content_script.send("load-storage-from-options", storage.read("from"), true);});
content_script.receive("load-storage-to-options", function () {content_script.send("load-storage-to-options", storage.read("to"), true);});
content_script.receive("load-storage-alt-options", function () {content_script.send("load-storage-alt-options", storage.read("alt"), true);});
content_script.receive("load-storage-isTextSelection-options", function () {content_script.send("load-storage-isTextSelection-options", storage.read("isTextSelection"), true);});
content_script.receive("load-storage-isDblclick-options", function () {content_script.send("load-storage-isDblclick-options", storage.read("isDblclick"), true);});
content_script.receive("load-storage-isTranslateIcon-options", function () {content_script.send("load-storage-isTranslateIcon-options", storage.read("isTranslateIcon"), true);});
content_script.receive("load-storage-enableHistory-options", function () {content_script.send("load-storage-enableHistory-options", storage.read("enableHistory"), true);});
content_script.receive("load-storage-numberHistoryItems-options", function () {content_script.send("load-storage-numberHistoryItems-options", storage.read("numberHistoryItems"), true);});
content_script.receive("load-readHistory-options", function () {content_script.send("load-readHistory-options", readHistory(), true);});
content_script.receive("load-clearOptionsHistory-options", function () {clearHistory();});
content_script.receive("save-from-options", function (e) {storage.write("from", e); sendOptions();});
content_script.receive("save-to-options", function (e) {storage.write("to", e); sendOptions();});
content_script.receive("save-alt-options", function (e) {storage.write("alt", e); sendOptions();});
content_script.receive("save-isTextSelection-options", function (e) {storage.write("isTextSelection", e); sendOptions();});
content_script.receive("save-isDblclick-options", function (e) {storage.write("isDblclick", e); sendOptions();});
content_script.receive("save-isTranslateIcon-options", function (e) {storage.write("isTranslateIcon", e); sendOptions();});
content_script.receive("save-enableHistory-options", function (e) {storage.write("enableHistory", e); sendOptions();});
content_script.receive("save-numberHistoryItems-options", function (e) {storage.write("numberHistoryItems", e); sendOptions();});

// Initialization
if (!storage.read("from")) {
  storage.write("from", "auto");
}
if (!storage.read("alt")) {
  storage.write("alt", "en");
}
if (!storage.read("isTextSelection")) {
  storage.write("isTextSelection", "false");
}
if (!storage.read("isDblclick")) {
  storage.write("isDblclick", "false");
}
if (!storage.read("isTranslateIcon")) {
  storage.write("isTranslateIcon", "true");
}
if (!storage.read("enableHistory")) {
  storage.write("enableHistory", "true");
}
if (!storage.read("numberHistoryItems")) {
  storage.write("numberHistoryItems", "100");
}
