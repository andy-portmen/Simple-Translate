var background = {}, manifest = {};

/**** wrapper (start) ****/
if (typeof self !== 'undefined' && self.port) { //Firefox
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  manifest.url = "resource://jid1-dgnibwqga0sibw-at-jetpack/igtranslator/";
}
else if (typeof safari !== 'undefined') { // Safari
  background.send = function (id, obj) {
    safari.self.tab.dispatchMessage("message", {
      id: id,
      data: obj
    });
  }
  background.receive = (function () {
    var callbacks = {};
    safari.self.addEventListener("message", function (e) {
      if (callbacks[e.name]) {
        callbacks[e.name](e.message);
      }
    }, false);
    
    return function (id, callback) {
      callbacks[id] = callback;
    }
  })();
  manifest.url = safari.extension.baseURI;
  
  document.addEventListener('contextmenu', function () {
    var selectedText = window.getSelection().toString();
    try {
      safari.self.tab.setContextMenuEventUserInfo(event, {selectedText: selectedText});
    } catch (e) {}
  }, false);
}
else {  // Chrome
  background.send = function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  }
  background.receive = function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.method == id) {
        callback(request.data);
      }
    });
  }
  manifest.url = chrome.extension.getURL("./");
}
/**** wrapper (end) ****/
var word, definition;

function html (tag, attrs, parent) {
  if (!attrs) attrs = {};
  var tag = document.createElement(tag);
  for (var i in attrs) {
    tag.setAttribute(i, attrs[i]);
  }
  if (parent) parent.appendChild(tag);
  return tag;
}

function insert () {
  var word, definition, keyCode;

  // make a bubble at start-up
  var isTextSelection = false;
  var isDblclick = false;
  
  var bubble = html("table", {
    "class": "igtranslator-bubble"
  }, document.body);
  /* Header */
  var header = html("td", {
    colspan: 4,
    "class": "igtranslator-header"
  }, html("tr", {}, bubble));
  /* Content */
  var content = html("table", {
    "class": "igtranslator-content"
  }, html("td", {colspan: 4}, html("tr", {}, bubble)));
  /* Footer */
  var footer = html("tr", {
    "class": "igtranslator-footer",
  }, bubble);
  var bookmarks = html("td", {
    style: "background-image: url(" + manifest.url + "data/content_script/bookmarks.png)",
    title: "Save to Phrasebook"
  }, footer);
  bookmarks.addEventListener("click", function () {
    if (!bookmarks.getAttribute("status")) {
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
    bookmarks.style.backgroundImage = "url(" + manifest.url + "data/content_script/bookmarks-loading.gif)";
  }, false);
  var voice = html("td", {
    style: "background-image: url(" + manifest.url + "data/content_script/voice.png)",
    title: "Listen"
  }, footer);
  voice.addEventListener("click", function () {
    var isVoice = voice.getAttribute("isVoice") == "true";
    if (!isVoice) return;
    background.send("play-voice", {
      word: word
    });
  }, false);
  var home = html("td", {
    style: "background-image: url(" + manifest.url + "data/content_script/home.png)",
    title: "Open Google Translate"
  }, footer);
  home.addEventListener("click", function (e) {
    background.send("open-page", {
      page: 'define', 
      word: word
    });
  });
  var settings = html("td", {
    style: "background-image: url(" + manifest.url + "data/content_script/settings.png)",
    title: "Open Settings"
  }, footer);
  settings.addEventListener("click", function () {
    background.send("open-page", {
     page: 'settings'
   });
  }, false);
  
  function requestBubbleTranslation(mouseX, mouseY, selectedText) {
    bubble.style.top = (mouseY + 16) + 'px';
    bubble.style.left = mouseX + 'px';
    bubble.style.display = 'table';
    header.innerHTML = '';
    header.style.backgroundImage = "url(" + manifest.url + "data/content_script/loading.gif)";
    content.innerHTML = '';
    content.style.display = "none";
    background.send("translation-request", selectedText);
  }
  background.receive("translation-response", function (data) {
    if (!data.wordIsCorrect && data.correctedWord) {
      return background.send("translation-request", data.correctedWord);
    }
    word = data.word;
    definition = data.definition;

    header.style.backgroundImage = "none";
    
    if (data.error) {
      header.textContent = "Cannot Access Google Translate!";
      content.style.backgroundImage = "url(" + manifest.url + "data/content_script/error.png)";
      content.style.display = "block";
      voice.style.backgroundImage = "url(" + manifest.url + "data/content_script/novoice.png)";
      voice.setAttribute("isVoice", "no");
    }
    else {
      content.style.backgroundImage = "none";
      if (data.phrasebook) {
        bookmarks.style.backgroundImage = "url(" + manifest.url + "data/content_script/bookmarks-saved.png)";
        bookmarks.setAttribute("status", "saved");
      }
      else {
        bookmarks.style.backgroundImage = "url(" + manifest.url + "data/content_script/bookmarks.png)";
        bookmarks.removeAttribute("status");
      }
      voice.style.backgroundImage = "url(" + manifest.url + "data/content_script/" + (data.isVoice ? "" : "no") + "voice.png)";
      voice.setAttribute("isVoice", data.isVoice);
      
      var details = data.detailDefinition;
      header.textContent = definition ? (details && details.length ? word + ': ' + definition : definition) : "Definition not found!";
      if (!details || !details.length) {
        return;
      }
      content.style.display = "block";
      details.forEach (function (detail) {
        var pos = html("td", {
          style: "color: #777; font-style: italic;"
        }, html("tr", {}, content)).textContent = detail.pos;
        detail.entry.forEach(function (entry) {
          var tr = html("tr", {}, content);
          var score = Math.round(entry.score * 90) + 10;
          html("div", {
            style: "width: 32px; height: 7px; background: linear-gradient(90deg, rgba(222,184,135,1.0) " + score + "%, rgba(222,184,135,0.3) " + score + "%);"
          }, html("td", {}, tr));
          html("td", {
            dir: "auto"
          }, tr).textContent = entry.word;
          html("td", {}, tr).textContent = entry.reverse_translation.join(", ");
        });
      });
    }
  });

  background.receive("context-menu-word-request", function () {
    var selectedText = window.getSelection().toString();
    background.send("context-menu-word-response", selectedText);
  });
  background.receive("context-menu-url-request", function () {
    background.send("context-menu-url-response", document.location.href);
  });  
  document.addEventListener('mousedown', function (e) {
    // Do not hide the panel when user clicks inside the panel
    var target = e.target || e.originalTarget;
    while (target.parentNode && target.getAttribute) {
      if (target == bubble) {
        return;
      }
      target = target.parentNode;
    }
    bubble.style.display = 'none';
  }, false);

  document.addEventListener('keydown', function (e) {
    keyCode = e.keyCode;
  }, false);
  document.addEventListener('keyup', function (e) {
    keyCode = null;
  }, false);
  document.addEventListener('mouseup', function (e) {
    if (!isTextSelection || !(e.metaKey || e.altKey || keyCode == 45)) return;
    var selectedText = window.getSelection().toString();
    if (selectedText.length > 2) {
      requestBubbleTranslation(e.clientX + window.scrollX, e.clientY + window.scrollY, selectedText);
    }
  }, false);
  document.addEventListener('dblclick', function (e) {
    if (!isDblclick) return;
    var target = e.target || e.originalTarget;
    var selectedText = window.getSelection().toString();
    if (target.localName == 'input'  || target.getAttribute('contenteditable') == 'true' || target.className.indexOf("editable") != -1) {return;}
    if (selectedText.length > 2) {
      requestBubbleTranslation(e.clientX + window.scrollX, e.clientY + window.scrollY, selectedText);
    }
  }, false);
  // Get options at start-up
  background.send("options-request", null);
  background.receive("options-response", function (data) {
    isTextSelection = data.isTextSelection;
    isDblclick = data.isDblclick;
  });
  background.receive("saved-to-phrasebook", function () {
    bookmarks.setAttribute("title", "Saved");
    bookmarks.setAttribute("status", "saved");
    bookmarks.style.backgroundImage = "url(" + manifest.url + "data/content_script/bookmarks-saved.png)";
  });
  background.receive("removed-from-phrasebook", function () {
    bookmarks.setAttribute("title", "Save to Phrasebook");
    bookmarks.removeAttribute("status");
    bookmarks.style.backgroundImage = "url(" + manifest.url + "data/content_script/bookmarks.png)";
  });  
  background.receive("failed-phrasebook", function (status) {
    bookmarks.setAttribute("title", "Sign-in required");
    bookmarks.setAttribute("status", status);
    bookmarks.style.backgroundImage = "url(" + manifest.url + "data/content_script/bookmarks" + (status ? "-saved" : "") + ".png)";
  });
}
if (window.top === window) {
  window.addEventListener("DOMContentLoaded", insert);
}