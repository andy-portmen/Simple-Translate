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

// Filter-out iFrame window
function insert () {
  // make a bubble at start-up
  var isTextSelection = false;
  var isDblclick = false;
  var bubbleDOM = document.createElement('div');
  bubbleDOM.setAttribute('class', 'selection_bubble');
  bubbleDOM.setAttribute('id', 'bubble_container');
  bubbleDOM.setAttribute('dir', 'auto');
  
  var toolbarDiv = document.createElement('div');
  toolbarDiv.setAttribute('class', 'header_bubble');
  var bookmarks = document.createElement('img');
  bookmarks.setAttribute("title", "Save to Phrasebook");
  bookmarks.setAttribute("style", "width: 16px;");
  bookmarks.src = manifest.url + "data/content_script/bookmarks.png";
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
    bookmarks.src = manifest.url + "data/content_script/bookmarks-loading.gif";
  }, false);
  
  background.receive("saved-to-phrasebook", function () {
    bookmarks.setAttribute("title", "Saved");
    bookmarks.setAttribute("status", "saved");
    bookmarks.src = manifest.url + "data/content_script/bookmarks-saved.png";
  });
  background.receive("removed-from-phrasebook", function () {
    bookmarks.setAttribute("title", "Save to Phrasebook");
    bookmarks.removeAttribute("status");
    bookmarks.src = manifest.url + "data/content_script/bookmarks.png";
  });  
  background.receive("failed-phrasebook", function (status) {
    bookmarks.setAttribute("title", "Sign-in required");
    bookmarks.setAttribute("status", status);
    bookmarks.src = manifest.url + "data/content_script/bookmarks" + (status ? "-saved" : "") + ".png";
  });
  
  var voice = document.createElement('img');
  voice.setAttribute("title", "Listen");
  voice.src = manifest.url + "data/content_script/voice.png";
  voice.addEventListener("click", function () {
    var isVoice = voice.getAttribute("isVoice") == "true";
    if (!isVoice) return;
    background.send("play-voice", {
      word: word
    });
  }, false);
  
  var settings = document.createElement('img');
  settings.setAttribute("title", "Open Settings");
  settings.src = manifest.url + "data/content_script/settings.png";
  settings.addEventListener("click", function () {
    background.send("open-page", {
     page: 'settings'
   });
  }, false);
  
  var home = document.createElement('img');
  home.setAttribute("title", "Open Google Translate");
  home.src = manifest.url + "data/content_script/home.png";
  home.addEventListener("click", function (e) {
    background.send("open-page", {
      page: 'define', 
      word: word
    });
  });

  var body = document.createElement('div');
  body.setAttribute('dir', 'auto');
  bubbleDOM.appendChild(body);
  
  toolbarDiv.appendChild(bookmarks);
  toolbarDiv.appendChild(voice);
  toolbarDiv.appendChild(home);
  toolbarDiv.appendChild(settings);
  bubbleDOM.appendChild(toolbarDiv);

  document.body.appendChild(bubbleDOM); 
  bubbleDOM.style.display = 'none';

  // Get options at start-up
  background.send("options-request", null);
  background.receive("options-response", function (data) {
    isTextSelection = data.isTextSelection;
    isDblclick = data.isDblclick;
  });
  
  function span (style, width) {
    var span = document.createElement('span');
    if (style) {
      span.setAttribute("style", style);
    }
    span.dir = 'auto';
    span.style.width = width ? (width == 'auto' ? 'auto' : width + 'px') : "100%";
    body.appendChild(span);
    return span;
  }
  
  function requestBubbleTranslation(mouseX, mouseY, selectedText) {
    bubbleDOM.style.top = (mouseY + 16) + 'px';
    bubbleDOM.style.left = mouseX + 'px';
    bubbleDOM.style.display = 'block'; 
    var img = document.createElement('img');
    img.setAttribute("style", "margin: 0 !important; display: inline-block;");
    img.src = manifest.url + "data/content_script/loading.gif";
    var img_span = span("display: block; height: 18px; text-align:center;");
    img_span.appendChild(img);
    body.appendChild(img_span);
    background.send("translation-request", selectedText);
  }

  var wrongWord = '';
  background.receive("translation-response", function (data) {
    if (!data.wordIsCorrect && data.correctedWord) {
      wrongWord = data.word;
      background.send("translation-request", data.correctedWord);
    }
    else {
      body.innerHTML = '';
      definition = data.definition;
      word = data.word;
      if (!data.error) {
        if (data.phrasebook) {
          bookmarks.src = manifest.url + "data/content_script/bookmarks-saved.png";
          bookmarks.setAttribute("status", "saved");
        }
        else {
          bookmarks.src = manifest.url + "data/content_script/bookmarks.png";
          bookmarks.removeAttribute("status");
        }
        voice.src = manifest.url + "data/content_script/" + (data.isVoice ? "" : "no") + "voice.png";
        voice.setAttribute("isVoice", data.isVoice);
        var title_span = span("font-size: 130%; display: block; text-align: center;");
        title_span.textContent = (data.word + ': ' + data.definition) || "not found";
        if (data.detailDefinition) {
          var detailDefinition = data.detailDefinition; 
          if (detailDefinition.length > 0) {
            var hr = document.createElement('hr');
            hr.setAttribute('class', 'selection_bubble_line');
            body.appendChild(hr);
            for (var i = 0; i < detailDefinition.length; i++) { // title            
              var title_text, title_text_1, title_text_2, title_text_3; 
              title_text_1 = span("display: inline-block; text-align: center; padding: 0 2px 0 2px;", 'auto'); 
              title_text_1.textContent = data.word;
              title_text_2 = span("display: inline-block; text-align: center; padding: 0 2px 0 2px;", 'auto'); 
              title_text_2.textContent = detailDefinition[i].pos ? "-" : "";
              title_text_3 = span("display: inline-block; text-align: center; padding: 0 2px 0 2px; font-style:italic; padding: 10px 0 0 5px; color: #777", 'auto'); 
              title_text_3.textContent = detailDefinition[i].pos;
              title_text = span("display: inline-block; text-align: left;"); // this is only in English
              title_text.appendChild(title_text_1);
              title_text.appendChild(title_text_2);
              title_text.appendChild(title_text_3);
              if (detailDefinition[i].entry) {  
                for (j = 0; j < detailDefinition[i].entry.length; j++) {  // entries
                  var score = Math.round(detailDefinition[i].entry[j].score * 100) + 10;
                  var line_span = span("display: block; height: 16px;");
                  var percent_span = span("display: inline-block; height: 9px; margin: 0 5px 0 5px; background-color: rgba(222, 184, 135, 0.3); vertical-align: middle; text-align: left;", 33);  // this is only in LTR
                  var percent = span("display: inline-block; height: 5px; margin: 0 0 10px 0; background-color: rgba(222, 184, 135, 1.0); vertical-align: middle; text-align: left;", 0.3 * score);  // this is only in LTR
                  percent_span.appendChild(percent);
                  line_span.appendChild(percent_span);
                  line_span.appendChild(document.createTextNode(detailDefinition[i].entry[j].word));
                  var text_direction = window.getComputedStyle(line_span, null).direction || '';
                  if (text_direction == 'rtl') line_span.style.textAlign = "right";
                  if (text_direction == 'ltr') line_span.style.textAlign = "left";
                  if (text_direction == '')    line_span.style.textAlign = "left";
                }
              }
            }
          }
        }
      }
      else {
        voice.src = manifest.url + "data/content_script/novoice.png";
        voice.setAttribute("isVoice", "no");
        var img = document.createElement('img');
        img.setAttribute("style", "margin-left: 70px !important;");
        img.src = manifest.url + "data/content_script/error.png";
        body.appendChild(img);
        span("font-size: 100%; display: block; padding: 10px 0 10px 0;").textContent = "Can't Access Google Translate";
      }
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
      if (target == bubbleDOM) {
        return;
      }
      target = target.parentNode;
    }

    bubbleDOM.style.display = 'none';
    body.innerHTML = '';
  }, false);
  var keyCode;
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
}
if (window.top === window) {
  window.addEventListener("DOMContentLoaded", insert);
}