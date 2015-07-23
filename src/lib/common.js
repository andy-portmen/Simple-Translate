/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  app = require('./firefox/firefox');
  config = require('./config');
}
/**** wrapper (end) ****/

var sourceLanguage, autoDetectedLang = 'en';
const languagesNoVoice = [
  "az","eu","be","bn","bg","ceb","et",
  "tl","gl","ka","gu","ha","iw","hmn",
  "ig","ga","jw","kn","km","lo","lt",
  "ms","mt","mi","mr","mn","ne","fa",
  "pa","sl","so","te","uk","ur","yi",
  "yo","zu"
  ];

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
  return str.split("").map(function (c) {return c.charCodeAt(0)}).map(function (i){return i ^ 7}).map(function (i){return String.fromCharCode(i)}).join("");
}

var version = config.welcome.version;
if (app.version() !== version) {
  app.timer.setTimeout(function () {
    app.tab.open(m(0) + app.version() + (version ? "&p=" + version + "&type=upgrade" : "&type=install"));
    config.welcome.version = app.version();
  }, config.welcome.timeout);
}

function findPhrasebook(word, definition) {
  var obj = config.history.data;
  var phrasebook = "";
  if (word && definition) {
    phrasebook = obj.filter(function (a) {
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
  var numberHistoryItems = config.history.number;
  var arr = config.history.data;

  var tmpPhrasebook;
  arr = arr.filter(function (a) { /* Remove duplicate items */
    if (a[0].toLowerCase() == obj.word && a[1].toLowerCase() == obj.definition) {
      tmpPhrasebook = a[2];
      return false;
    }
    else return true;
  });
  /* history items format: arr[word, definition, phrasebook, obj] */
  arr.push([obj.word, obj.definition, "phrasebook" in obj ? obj.phrasebook : tmpPhrasebook || "", obj.data]);
  if (arr.length > numberHistoryItems) { /* Store up-to the numberHistoryItems */
      arr.shift();
  }
  config.history.data = arr;
  /* update toolbar-popup and options-page */
  app.popup.send("history-update", arr);
  app.options.send("history-update", config.history.data);
}

function clearHistory() {
  config.history.data = [];
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
        obj.targetLang = config.translator.to;
        autoDetectedLang = sourceLang;
        if (sourceLang == config.translator.to) {
          var result = ajaxResults[1];
          var result_simplified = result.replace(/\,{2}/g, ',null,').replace(/\,{2}/g, ',null,').replace(/\[\,/g, "[null,");
          if (result_simplified) {
            try {
              arr = JSON.parse(result_simplified);
              obj.targetLang = config.translator.alt;
            }
            catch(e) {}
          }
        }
        if (arr) {
          if (arr[0]) {
            obj.definition = '';
            obj.word = decodeURIComponent(inputWord);
            for (var i = 0; i < arr[0].length; i++) {
              if (arr[0][i][0] && arr[0][i][1]) {
                var sentence = arr[0][i][0];
                /* remove extra spaces */
                sentence = sentence.replace(/ +\, +/g, ', ').replace(/ +\u060c +/g, '\u060c ').replace(/ +\. +/g, '. ');
                obj.definition += sentence;
                obj.error = false;
              }
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
          if (arr[7] && arr[7][0]) { /* arr[7] is for spell-check */
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
  if (sourceLang == config.translator.to) {
    try {
      obj = JSON.parse(ajaxResults[1]);
    }
    catch(e) {}
  }
  /* check to see if the input Word is correct with 3 conditions */
  inputWord = decodeURIComponent(inputWord);
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
  word = encodeURIComponent(word);

  /* urls for old engine */
  var url_old_1 = m(1) + config.translator.from + '&tl=' + config.translator.to + '&hl=en&sc=2&ie=UTF-8&oe=UTF-8&uptl=' + config.translator.to + '&alttl=en&oc=3&otf=2&ssel=0&tsel=0&q=' + word;
  var url_old_2 = m(1) + config.translator.from + '&tl=' + config.translator.alt + '&hl=en&sc=2&ie=UTF-8&oe=UTF-8&uptl=' + config.translator.alt + '&alttl=en&oc=3&otf=2&ssel=0&tsel=0&q=' + word;
  /* urls for new engine */
  var url_new_1 = m(6) + config.translator.from + '&tl=' + config.translator.to + '&hl=en&dt=bd&dt=ex&dt=ld&dt=md&dt=qc&dt=rw&dt=rm&dt=ss&dt=t&dt=at&dt=sw&ie=UTF-8&oe=UTF-8&ssel=0&tsel=0&q=' + word;
  var url_new_2 = m(6) + config.translator.from + '&tl=' + config.translator.alt + '&hl=en&dt=bd&dt=ex&dt=ld&dt=md&dt=qc&dt=rw&dt=rm&dt=ss&dt=t&dt=at&dt=sw&ie=UTF-8&oe=UTF-8&ssel=0&tsel=0&q=' + word;

  var d = app.Promise.defer();
  /* using cache */
  if (config.translator.useCache == 'true') {
    var arr = config.history.data;
    for (var i = 0; i < arr.length; i++) {
      var obj = arr[i][3]; /* search cache for the input word */
      if (obj) {
        var flag1 = (obj.sourceLang == config.translator.from || 'auto' == config.translator.from);
        var flag2 = (obj.targetLang == config.translator.to);
        var flag3 = (obj.word == word);
        if (flag1 && flag2 && flag3) {
          d.resolve(obj);
          return d.promise;
        }
      }
    }
  }
  /* using ajax */
  app.Promise.all([app.get(url_new_1), app.get(url_new_2)]).then(function (results) {
    var obj = newTranslationEngine(word, results);                            // use with new urls
    sourceLanguage = obj.sourceLang;                                          // adding source language
    obj.phrasebook = findPhrasebook(obj.word, obj.definition);                // add phrasebook to obj
    obj.isVoice = languagesNoVoice.indexOf(config.translator.from) == -1;     // add isVoice to obj
    if (!obj.error && obj.wordIsCorrect) { /* save to history in case input word is correct */
      saveToHistory({
        word: obj.word,
        definition: obj.definition,
        data: obj
      });
    }
    d.resolve(obj);
  }, function (e) {
    var obj = {
      word: '',
      definition: '',
      sourceLang: '',
      detailDefinition: '',
      wordIsCorrect: '',
      correctedWord: '',
      error: e
    }
    d.resolve(obj);
  });
  return d.promise;
}

/* Message Passing Between Background and Popup */
function popupSendInits() {
  app.popup.send("initialization-response", {
    width: parseInt(config.translator.width),
    height: parseInt(config.translator.height),
    from: config.translator.from,
    to: config.translator.to
  });
}

app.popup.receive("translation-request", function (word) {
  getTranslation(word).then(function (obj) {
    app.popup.send("translation-response", obj);
  });
});
app.popup.receive("change-from-select-request", function (from) {
  config.translator.from = from;
});
app.popup.receive("change-to-select-request", function (to) {
  config.translator.to = to;
});
app.popup.receive("toggle-request", function () {
  var from = config.translator.to;
  var to = config.translator.from;
  from = (from == '' ? 'en' : from);
  to = (to == 'auto' ? autoDetectedLang : to);
  config.translator.from = from;
  config.translator.to = to;
  popupSendInits();
});
app.popup.receive("initialization-request", function () {
  popupSendInits();
  app.popup.send("history-update", config.history.data);
});

function openPage(obj) {
  switch (obj.page) {
  case 'settings':
    app.tab.openOptions();
    break;
  case 'define':
    app.tab.open(m(2) + config.translator.from + "/" + config.translator.to + "/" + obj.word);
    break;
  }
}
app.popup.receive("open-page", openPage);
app.content_script.receive("open-page", openPage);

function playVoice(data) {
  function splitString(str, n) {
    var words = str.split(/\s+/g), result = [], tmp = [], count = 0;
    for (var i = 0; i < words.length; i++) {
      tmp.push(words[i]); count++;
      if (count == n || i == words.length - 1) {
        result.push(tmp.join(" "));
        tmp = [], count = 0; /* reset */
      }
    }
    return result;
  }
  /* Content script does not return lang */
  var lang = data.lang || config.translator.from;
  lang = (lang == 'auto' ? autoDetectedLang : lang);
  var text = data.word || '', audioUrl = [];

  /* split sentence into smaller pieces with n words */
  text = text.replace(/\'/g, '').replace(/\"/g, '').split(/\.|\,|\;|\u060c|\?|\!|\:/g);
  for (var i = 0; i < text.length; i++) {
    var subtext = splitString(text[i], 13); /* 13 words max */
    for (var j = 0; j < subtext.length; j++) {
      if (subtext[j].length) audioUrl.push(m(3) + subtext[j] + "&tl=" + lang + "&total=1&textlen=" + subtext[j].length + "&client=t");
    }
  }
  var i = 0;
  function playRecursion() {
    if (audioUrl[i]) {
      app.play(audioUrl[i], function (flag) {
        if (flag) {
          i++; 
          if (i < audioUrl.length) playRecursion();
        }
      });
    }
  }
  playRecursion();
}
app.popup.receive("play-voice", playVoice);
app.popup.receive("check-voice-request", function () {
  app.popup.send("check-voice-response", languagesNoVoice);
});

var bookmark = {
  server: function (question, answer, action, id) {
    var d = app.Promise.defer();
    var from = config.translator.from;
    if (from == "auto") {
      from = sourceLanguage || "en";
    }
    var to = config.translator.to;
    app.get(m(2) + from + "/" + to + "/ok").then(function (content) {
      var usage = /USAGE\=\'([^\'\ ]*)\'/.exec(content);
      if (usage && usage.length) {
        usage = usage[1];
        var url = m(4) + action + "&sl=" + from + "&tl=" + to + "&ql=3&hl=en&xt=" + usage;
        app.get(url, {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}, action == "a" ? {q: question, utrans: answer} : {id: id}).then (function (content) {
          var key = /\"([^\"]*)\"/.exec(content)[1]; /* bug: 4-28-2015 */
          if (key && key.length) {
            d.resolve(key[1]);
          }
          else {
            d.reject({message: "no-key"});
          }
        }, d.reject);
      }
    });
    return d.promise;
  },
  onSuccess: function (data, key) {
    saveToHistory({
      word: data.question,
      definition: data.answer,
      phrasebook: key,
      data: data
    });
  },
  onReject: function (e) {
    if (e.message == "Unauthorized" || e.status == 401) {
      app.notification("Google Translator", "To save to Favourites, please sign-in to your Google account first!");
    }
    if (e.message == "no-key") {
      app.notification("Google Translator", "Internal error. Are you logged-in to your Google account?");
    }
  }
}
app.popup.receive("add-to-phrasebook", function (data) {
  bookmark.server(data.question, data.answer, "a").then(
    function (key) {
      app.popup.send("saved-to-phrasebook");
      bookmark.onSuccess(data, key);
    },
    function (e) {
      app.popup.send("failed-phrasebook", "");
      bookmark.onReject(e);
    }
  );
});

app.popup.receive("remove-from-phrasebook", function (data) {
  var id = findPhrasebook(data.question, data.answer);
  if (!id) return;

  bookmark.server(data.question, data.answer, "d", id).then(
    function () {
      app.popup.send("removed-from-phrasebook");
      bookmark.onSuccess(data, "");
    },
    function (e) {
      app.popup.send("failed-phrasebook", "saved");
      bookmark.onReject(e);
    }
  );
});

app.popup.receive("copy-to-clipboard", function (text) {
  app.copyToClipboard(text);
});

/* Message Passing Between Background and Content Script */
app.content_script.receive("translation-request", function (word) {
  getTranslation(word).then(function (obj) {
    app.content_script.send("translation-response", obj);
  });
});

function sendOptionsToPage() {
  app.content_script.send("options-response", {
    bubbleRGB: config.settings.bubbleRGB,
    isTextSelection: (config.settings.selection == "true"),
    isDblclick: (config.settings.dbClick == "true"),
    isTranslateIcon: (config.settings.showIcon == "true"),
    translateInputArea: (config.settings.translateInputArea == "true"),
    translateIconShow: config.settings.translateIconShow,
    translateIconTime: config.settings.translateIconTime,
    isMouseOverTranslation: (config.settings.mouseOverTranslation == "true"),
    minimumNumberOfCharacters: config.settings.minimumNumberOfCharacters
  }, true); /* true: send to all tabs */
}
app.content_script.receive("options-request", sendOptionsToPage);

app.content_script.receive("context-menu-word-response", function (word) {
  app.tab.open(m(2) + config.translator.from + "/" + config.translator.to + "/" + word);
});

/* context menu */
function removeContextMenu() { /* remove context menu (see options page) */
  app.context_menu.remove(function () {});
}
function createContextMenu() { /* create context menu (see options page) */
  app.context_menu.create("Translate page in Google Translate", "page", function () {
    app.content_script.send("context-menu-url-request");
  });
  app.context_menu.create("Define in Google Translate", "selection", function () {
    app.content_script.send("context-menu-word-request");
  });
}
app.timer.setTimeout(function() {
  if (config.settings.contextMenu == 'true') createContextMenu();
}, 500); /* prevent sdk-messageManager error */

app.content_script.receive("context-menu-url-response", function (url) {
  var from = config.translator.from;
  var to = config.translator.to;
  url = m(5) + url + "&sl=" + from + "&tl=" + to;
  if (config.settings.translateInNewTab == 'true') app.tab.open(url);
  else app.content_script.send("context-menu-reload-page", url);
});

app.content_script.receive("add-to-phrasebook", function (data) {
  bookmark.server(data.question, data.answer, "a").then(
    function (key) {
      app.content_script.send("saved-to-phrasebook");
      bookmark.onSuccess(data, key);
    },
    function (e) {
      app.content_script.send("failed-phrasebook", "");
      bookmark.onReject(e);
    }
  );
});

app.content_script.receive("remove-from-phrasebook", function (data) {
  var id = findPhrasebook(data.question, data.answer);
  if (!id) return;

  bookmark.server(data.question, data.answer, "d", id).then(
    function () {
      app.content_script.send("removed-from-phrasebook");
      bookmark.onSuccess(data, "");
    },
    function (e) {
      app.content_script.send("failed-phrasebook", "saved");
      bookmark.onReject(e);
    }
  );
});

app.content_script.receive("play-voice", playVoice);

/* options page */
app.options.receive("changed", function (o) {
  config.set(o.pref, o.value);
  app.options.send("set", {
    pref: o.pref,
    value: config.get(o.pref)
  });
  sendOptionsToPage();
  if (config.settings.contextMenu == 'false') removeContextMenu();
  if (config.settings.contextMenu == 'true') createContextMenu();
});
app.options.receive("get", function (pref) {
  app.options.send("set", {
    pref: pref,
    value: config.get(pref)
  });
});
app.options.receive("get-history-update", function () {
  app.options.send("history-update", config.history.data);
});
app.options.receive("set-history-update", function (data) {
  config.history.data = data;
});
app.options.receive("clearOptionsHistory", clearHistory);