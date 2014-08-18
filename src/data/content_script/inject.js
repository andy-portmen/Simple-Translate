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

function init() {
  // Global Variables
  var word, definition, keyCode;
  var bubble, header, content, footer, bookmarks, voice, home, settings; 
  var isTextSelection = false;
  var isDblclick      = false;
  var isTranslateIcon = false;
  
  function html(tag, attrs, parent) {
    if (!attrs) attrs = {};
    var elm = document.createElement(tag);
    for (var i in attrs) {
      elm.setAttribute(i, attrs[i]);
    }
    if (parent) parent.appendChild(elm);
    return elm;
  }

  function dir(e) {
    var text_direction = window.getComputedStyle(e, null).direction || '';
    if (text_direction == 'rtl') e.style.textAlign = "right";
    if (text_direction == 'ltr') e.style.textAlign = "left";
  }

  function getSelectedRect(w) {
    var range = w.getRangeAt(0).cloneRange();
    var rect = range.getBoundingClientRect();
    return rect;
  }
  
  function requestBubbleTranslation() {
    header.innerHTML = '';
    content.innerHTML = '';
    translateIcon.style.display = 'none';
    var rect = requestBubbleTranslation.rect;
    iFrame.style.top = (rect.top + window.scrollY + rect.height) + 'px';
    iFrame.style.left = (rect.left + window.scrollX - 23 + rect.width / 2) + 'px';  
    iFrame.style.width = (170) + "px";
    iFrame.style.height = (70) + "px";
    iFrame.style.display = 'block';
    header.style.backgroundImage = "url(" + manifest.url + "data/content_script/loading.gif)";
    content.style.display = "none";
    background.send("translation-request", requestBubbleTranslation.text);
  }
  
  function showTranslateIcon() {
    var rect = requestBubbleTranslation.rect;
    translateIcon.style.top = (rect.top + window.scrollY - 18) + 'px';
    translateIcon.style.left = (rect.left + window.scrollX + rect.width - 2) + 'px';
    translateIcon.style.display = "block";
  }

  /* iFrame */
  var iFrame = html("iframe", {
    src: "about:blank",
    "class": "igtranslator-iframe",
    scrolling: "no",
    frameborder: 0
  }, document.body);
  window.setTimeout(function () { // wait to load iframe
    if (iFrame.contentDocument) {
      var cssLink = html("link", {
        href: manifest.url + "data/content_script/inject.css",
        rel: "stylesheet",
        type: "text/css"
      }, iFrame.contentDocument.head);
      /* Bubble */
      bubble = html("table", {
        "class": "igtranslator-bubble"
      }, iFrame.contentDocument.body);
      /* Header */
      header = html("td", {
        colspan: 4,
        "class": "igtranslator-header"
      }, html("tr", {}, bubble));
      /* Content */
      content = html("tbody", {
        "class": "igtranslator-content"
      }, html("table", {style: "width: 100%;"}, html("td", {colspan: 4}, html("tr", {}, bubble))));
      /* Footer */
      footer = html("tr", {
        "class": "igtranslator-footer",
      }, bubble);
      /* Bookmarks */
      bookmarks = html("td", {
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
      /* Voice Icon */
      voice = html("td", {
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
      /* Home Icon */
      home = html("td", {
        style: "background-image: url(" + manifest.url + "data/content_script/home.png)",
        title: "Open Google Translate"
      }, footer);
      home.addEventListener("click", function (e) {
        background.send("open-page", {
          page: 'define', 
          word: word
        });
      });
      /* Settings Icon */
      settings = html("td", {
        style: "background-image: url(" + manifest.url + "data/content_script/settings.png)",
        title: "Open Settings"
      }, footer);
      settings.addEventListener("click", function () {
        background.send("open-page", {
         page: 'settings'
       });
      }, false);
    }
  }, 500);
  
  /* Translate Icon */
  var translateIcon = html("div", {
    "class": "igtranslator-activator-icon",
    style: "background-image: url(" + manifest.url + "data/content_script/icon.png)",
    title: "Click to Show Translation"
  }, document.body);
  translateIcon.addEventListener("click", requestBubbleTranslation, false);

  background.receive("context-menu-word-request", function () {
    var selectedText = window.getSelection().toString();
    background.send("context-menu-word-response", selectedText);
  });
  
  background.receive("context-menu-url-request", function () {
    background.send("context-menu-url-response", document.location.href);
  });  
  
  background.receive("translation-response", function (data) {
    iFrame.style.width = (600) + "px";
    iFrame.style.height = (300) + "px";
    if (!data.wordIsCorrect && data.correctedWord) {
      background.send("translation-request", data.correctedWord);
    }
    else {
      word = data.word;
      definition = data.definition;
      header.style.backgroundImage = "none";
      content.style.display = "block";
      if (data.error) {
        header.textContent = "Cannot Access Google Translate!";
        content.style.backgroundImage = "url(" + manifest.url + "data/content_script/error.png)";
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
        
        var synonyms = data.synonyms;
        var similars = data.similar_words;
        var details = data.detailDefinition;
        var flag1 = false, flag2 = false, flag3 = false;
        header.textContent = definition ? (details && details.length ? word + ': ' + definition : definition) : "Definition not found!";
        if (details && details.length) {
          flag1 = true;
          details.forEach(function (detail) {
            var pos = html("td", {
              style: "color: #777; font-style: italic;"
            }, html("tr", {}, content)).textContent = detail.pos;
            detail.entry.forEach(function (entry) {
              var tr = html("tr", {style: ""}, content);
              var score = Math.round((entry.score || 0) * 90) + 10;
              html("div", {
                style: "width: 32px; height: 7px; background: linear-gradient(90deg, rgba(222,184,135,1.0) " + score + "%, rgba(222,184,135,0.3) " + score + "%);"
              }, html("td", {}, tr));
              var direct_translation = html("td", {dir: "auto"}, tr);
              direct_translation.textContent = entry.word; 
              dir(direct_translation);
              var reverse_translation = html("td", {dir: "auto"}, tr);
              reverse_translation.textContent = entry.reverse_translation.join(", "); 
              dir(reverse_translation);
            });
          });
        }
        if (synonyms && synonyms.length) {
          flag2 = true;
          synonyms.forEach(function (synonym) {
            var pos = html("td", {
              style: "color: #777; font-style: italic;"
            }, html("tr", {}, content)).textContent = "synonyms";
            synonym.entry.forEach(function (entry) {
              var tr = html("tr", {style: ""}, content);
              html("div", {
                style: "width: 32px; height: 7px; background: linear-gradient(90deg, rgba(222,184,135,1.0) " + 0 + "%, rgba(222,184,135,0.3) " + 0 + "%);"
              }, html("td", {}, tr));
              var pos = html("td", {
                dir: "auto", 
                style: "color: #777; font-style: italic;"
              }, tr);
              pos.textContent = synonym.pos; 
              dir(pos);
              var translation_synonyms = html("td", {dir: "auto"}, tr);
              translation_synonyms.textContent = entry.join(", "); 
              dir(translation_synonyms);
            });
          });
        }
        if (similars && similars.length) {
          flag3 = true;
          var tr = html("tr", {}, content);
          html("div", {
            style: "width: 32px; height: 7px; background: linear-gradient(90deg, rgba(222,184,135,1.0) " + 0 + "%, rgba(222,184,135,0.3) " + 0 + "%);"
          }, html("td", {}, tr));
          var pos = html("td", {
            style: "color: #777; font-style: italic;"
          }, tr);
          pos.textContent = "see also";
          var translation_similars = html("td", {dir: "auto"}, tr);
          translation_similars.textContent = similars.join(", "); 
          dir(translation_similars);
        }
        // delete content if there is nothing to show
        if (!flag1 && !flag2 && !flag3) {
          content.style.display = "none";
          header.style.fontSize = "110%";
        }
      }
    }
    var W = window.getComputedStyle(bubble, null).getPropertyValue("width");
    var H = window.getComputedStyle(bubble, null).getPropertyValue("height");
    iFrame.style.width = (parseInt(W) + 20) + "px";
    iFrame.style.height = (parseInt(H) + 20) + "px";
  });
  
  document.addEventListener('mousedown', function (e) {
    var target = e.target || e.originalTarget;
    while (target.parentNode && target.getAttribute) {
      if (target == bubble || target == translateIcon) {
        return; // Do not hide the panel when user clicks inside the panel
      }
      target = target.parentNode;
    }
    translateIcon.style.display = 'none';
    iFrame.style.display = 'none';
    iFrame.style.width = (0) + "px";
    iFrame.style.height = (0) + "px";
  }, false); 
  
  document.addEventListener('keydown', function (e) {
    keyCode = e.keyCode;
  }, false);
  
  document.addEventListener('keyup', function (e) {
    keyCode = null;
  }, false);
  
  document.addEventListener('mouseup', function (e) {
    var selectedText = window.getSelection().toString();
    if (selectedText.length > 2) {
      requestBubbleTranslation.text = window.getSelection().toString();
      requestBubbleTranslation.rect = getSelectedRect(window.getSelection());
      if (isTranslateIcon && iFrame.style.display == 'none') {
        showTranslateIcon();
      }
      else if (isTextSelection && (e.metaKey || e.altKey || keyCode == 45)) {
        requestBubbleTranslation();
      }
    }
  }, false);
  
  document.addEventListener('dblclick', function (e) {
    var target = e.target || e.originalTarget;
    if (target.localName == 'input'  || target.getAttribute('contenteditable') == 'true' || target.className.indexOf("editable") != -1) return;
    var selectedText = window.getSelection().toString();
    if (selectedText.length > 2) {
      requestBubbleTranslation.text = window.getSelection().toString();
      requestBubbleTranslation.rect = getSelectedRect(window.getSelection());
      if (isTranslateIcon && iFrame.style.display == 'none') {
        showTranslateIcon();
      }
      else if (isDblclick) {
        requestBubbleTranslation();
      }
    }
  }, false);
  
  // Get options at start-up
  background.send("options-request", null);
  
  background.receive("options-response", function (data) {
    isTextSelection = data.isTextSelection;
    isDblclick = data.isDblclick;
    isTranslateIcon = data.isTranslateIcon;
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
  window.addEventListener("DOMContentLoaded", init);
}