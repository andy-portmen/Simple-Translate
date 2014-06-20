var background = {};
/**** wrapper (start) ****/
if (typeof chrome !== 'undefined') {  // Chrome
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
  window.setTimeout(function () {
    init();
    $("question-input").focus();
  }, 100);
}
else if (typeof safari !== 'undefined') { // Safari
  background = (function () {
    var callbacks = {};
    return {
      send: function (id, data) {
        safari.extension.globalPage.contentWindow.popup.dispatchMessage(id, data);
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      },
      dispatchMessage: function (id, data) {
        if (callbacks[id]) {
          callbacks[id](data);
        }
      }
    }
  })();
  var doResize = function () {
    safari.self.width = document.body.getBoundingClientRect().width + 10;
    safari.self.height = document.body.getBoundingClientRect().height + 10;
  }
  window.addEventListener("resize", doResize, false);
  safari.application.addEventListener("popover", function (){
    window.setTimeout(function () {
      init();
      $("question-input").focus();
    }, 100);
  }, false);
}
else {  // Firefox
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  self.port.on("show", function () {
    init();
    $("question-input").focus();
  });
  var doResize = function () {
    self.port.emit("resize", {
      w: document.body.getBoundingClientRect().width,
      h: document.body.getBoundingClientRect().height
    });
  }
  window.addEventListener("resize", doResize, false);
}
/**** wrapper (end) ****/

function $ (id) {
  return document.getElementById(id);
}

$('fromto-td').addEventListener('click', function () {
  var difinition = $("definition-table").getAttribute("definition");
  if (difinition) {
    $("question-input").value = difinition;
    $("question-input").setAttribute("word", difinition);
  }
  background.send("toggle-request");
}, false);

$('home-td').addEventListener('click', function () {
    background.send("open-page", {
      page: 'define',
      word: $("question-input").getAttribute("word")
    });
}, false);

$('settings-td').addEventListener('click', function () {
    background.send("open-page", {
     page: 'settings'
   });
}, false);

function onClick() {
  $("answer-title").textContent = '';
  $("answer-details").innerHTML = '';

  var word = $("question-input").getAttribute("word");
  if (!word) return;
  var toSelect = $("to-select");
  var value = toSelect.children[toSelect.selectedIndex].getAttribute("value");
  if (!value) {
    $("answer-title").textContent = "select your language!";
  }
  else {
    background.send("translation-request", word);
    $("definition-table").setAttribute('state', 'loading');
  }
  $("question-input").select();
}

$("history-select").addEventListener("change", function (e) {
  var target = e.target || e.originalTarget;
  var word = target.children[target.selectedIndex].getAttribute("value");
  $('question-input').value = word;
  $('question-input').setAttribute("word", word);
  onClick();
}, false);

$("question-input").addEventListener("change", function (e) {
  $("question-input").setAttribute("word", $("question-input").value);
  onClick();
}, false);

// Message Passing Between Background and Popup
var wrongWord = '';
background.receive("translation-response", function (obj) {
  $("answer-title").textContent = "";
  $("answer-details").innerHTML = "";
  $("definition-table").removeAttribute('state');
  function html (tag, attrs, parent) {
    if (!attrs) attrs = {};
    var tag = document.createElement(tag);
    for (var i in attrs) tag.setAttribute(i, attrs[i]);
    if (parent) parent.appendChild(tag);
    return tag;
  }
  if (!obj.error) {
    if (obj.wordIsCorrect) {
      $("question-input").setAttribute("word", obj.word);
      if (wrongWord) $("question-input").value = wrongWord + " >> " + obj.word;
      else $("question-input").value = obj.word;
      wrongWord = '';
      
      $("question-input").select();
      $("definition-table").setAttribute("definition", obj.definition);
      var fs = $("from-select").children[$("from-select").selectedIndex];
      if (fs.value == 'auto' && obj.sourceLang) {
        fs.textContent = 'Auto (' + obj.sourceLang + ')';
        $("from-select").setAttribute("detected-language", obj.sourceLang);
      }
      if (obj.phrasebook) {
        $("phrasebook-td").setAttribute("status", "saved");
        $("phrasebook-td").setAttribute("title", "Saved");
      }
      else {
        $("phrasebook-td").removeAttribute("status");
        $("phrasebook-td").setAttribute("title", "Save to Phrasebook");
      }
      $("answer-title").textContent = obj.definition;
      if (obj.detailDefinition && obj.detailDefinition.length) {
        obj.detailDefinition.forEach (function (detail) {
          var pos = html("td", {
            style: "color: #777; font-style: italic; height: 22px;"
          }, html("tr", {}, $("answer-details"))).textContent = detail.pos;
          detail.entry.forEach(function (entry) {
            var tr = html("tr", {}, $("answer-details"));
            var score = Math.round(entry.score * 90) + 10;
            html("div", {
              style: "width: 48px; height: 7px; background: linear-gradient(90deg, rgba(76,142,251,1.0) " + score + "%, rgba(76,142,251,0.3) " + score + "%);"
            }, html("td", {}, tr));
            html("td", {
              style: "",
              dir: "auto"
            }, tr).textContent = entry.word;
            html("td", {}, tr).textContent = entry.reverse_translation.join(", ");
          });
        });
      }
    }
    else {
      background.send("translation-request", obj.correctedWord);
      $("answer-title").textContent = "Check Spelling..";
      $("definition-table").setAttribute('state', 'loading');
      wrongWord = obj.word;
    }
  }
  else {
    $("answer-title").textContent = "Can't Access Google Translate";
    $("definition-table").setAttribute('state', 'error');
  }
})
;
background.receive("history-update", function (obj) {
  var historySelect = $("history-select");
  historySelect.innerHTML = "";

  function addNewItem(word, definition, index) {
    var option = document.createElement("option");
    option.textContent = word + ": " + definition;
    option.setAttribute("value", word);
    if (index == 0) {
      option.textContent = "- please select -";
      option.setAttribute("value", "");
    }
    historySelect.appendChild(option);
  }
  addNewItem('', '', 0);
  var count = 0;
  obj.reverse().forEach(function (o, i) {
    if (count > 9) {return;} // store 10 items in pop-up list
    if ((o[0].length + o[1].length) < 50) { // do not include large sentences in short history list
      addNewItem(o[0], o[1], count + 1);
      count++;
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
  var target = e.target || e.originalTarget;
  var from = target.children[target.selectedIndex].value;
  background.send("change-from-select-request", from);
  checkVoice();
  onClick();
}, false);
$('to-select').addEventListener("change", function (e) {
  var target = e.target || e.originalTarget;
  var to = target.children[target.selectedIndex].value;
  background.send("change-to-select-request", to);
  checkVoice();
  onClick();
}, false);
$('voice-question-td').addEventListener("click", function(e) {
  var target = e.target || e.originalTarget;
  if (target.getAttribute("voice") == "false") return;

  var word = $("question-input").getAttribute("word");
  var lang = $('from-select').children[$('from-select').selectedIndex].value;
  if (lang == 'auto') {
    lang = $('from-select').getAttribute("detected-language");
  }
  playVoice(word, lang);
}, false);
$('voice-answer-td').addEventListener("click", function(e) {
  var target = e.target || e.originalTarget;
  if (target.getAttribute("voice") == "false") return;

  var word = $('definition-table').getAttribute("definition");
  var lang = $('to-select').children[$('to-select').selectedIndex].value;
  playVoice(word, lang);
}, false);

$('phrasebook-td').addEventListener("click", function(e) {
  var target = e.target || e.originalTarget;
  var word = $("question-input").getAttribute("word");
  var definition = $("definition-table").getAttribute("definition");
  if (!word || !definition) return;
  if (!target.getAttribute("status")) {
    background.send("add-to-phrasebook", {
      question: word,
      answer: definition
    });
  }
  else {
    background.send("remove-from-phrasebook", {
      question: word,
      answer: definition
    });
  }
  target.setAttribute("status", "loading");
}, false);

function playVoice(word, lang) {
  background.send("play-voice", {
    word: word,
    lang: lang
  });
}

function checkVoice() {
  background.send("check-voice-request");
}
background.receive("check-voice-response", function (arr) {
  var fromLang = $('from-select').children[$('from-select').selectedIndex].value;
  if (fromLang == 'auto') {
    fromLang = $('from-select').getAttribute("detected-language") || "en";
  }
  var toLang = $('to-select').children[$('to-select').selectedIndex].value;

  $("voice-question-td").setAttribute("voice", arr.indexOf(fromLang) == -1);
  $("voice-answer-td").setAttribute("voice", arr.indexOf(toLang) == -1);
});

background.receive("saved-to-phrasebook", function () {
  $("phrasebook-td").setAttribute("title", "Saved");
  $("phrasebook-td").setAttribute("status", "saved");
});
background.receive("removed-from-phrasebook", function () {
  $("phrasebook-td").setAttribute("title", "Save to Phrasebook");
  $("phrasebook-td").removeAttribute("status");
});
background.receive("failed-phrasebook", function (status) {
  $("phrasebook-td").setAttribute("title", "Sign-in required");
  $("phrasebook-td").setAttribute("status", status);
});

// Initialization
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
  checkVoice();
  onClick();
});
//This needs to be after background.receive("initialization-response")
function init() {
  $("answer-title").textContent = "";
  $("answer-details").innerHTML = "";
  $("definition-table").removeAttribute('state');
  background.send("initialization-request");
}
