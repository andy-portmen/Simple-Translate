/********/
var background = {}, manifest = {};
if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  manifest.url = "resource://jid1-dgnibwqga0sibw-at-jetpack/igtranslator/";
}
else {
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
/********/
var word, definition;

// Filter-out iFrame window
function insert () {
  // make a bubble at start-up
  var isTextSelection = false;
  var isDblclick = false;
  var bubbleDOM = document.createElement('div');
  bubbleDOM.setAttribute('class', 'selection_bubble');
  bubbleDOM.setAttribute('id', 'bubble_container');
  
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

  function requestBubbleTranslation(mouseX, mouseY, selectedText) {
    bubbleDOM.style.top = (mouseY + 16) + 'px';
    bubbleDOM.style.left = mouseX + 'px';
    bubbleDOM.style.display = 'block'; 
    var img = document.createElement('img');
    img.setAttribute("style", "margin-left: 50px;");
    img.src = manifest.url + "data/content_script/loading.gif";
    body.appendChild(img);
    background.send("translation-request", selectedText);
  }

  background.receive("translation-response", function (data) {
    // Global
    definition = data.definition;
    word = data.word;
    function span (style) {
      var span = document.createElement('span');
      if (style) {
        span.setAttribute("style", style);
      }
      span.dir = "auto";
      body.appendChild(span);
      return span;
    }

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
  
    body.innerHTML = '';
    span("font-size: 130%; display: block; width: 100%;").textContent = data.definition || "not found";
    if (data.detailDefinition) {
      var detailDefinition = data.detailDefinition; 
      if (detailDefinition.length > 0) {
        var hr = document.createElement('hr');
        hr.setAttribute('class', 'selection_bubble_line');
        body.appendChild(hr);
        for (var i = 0; i < detailDefinition.length; i++) { // title
          span("display: inline-block;").textContent = data.word + (detailDefinition[i].pos ? " -" : "");
          span("display: inline-block; font-style:italic; padding: 10px 0 0 5px; color: #777").textContent = detailDefinition[i].pos;
          if (detailDefinition[i].entry) {
            for (j = 0; j < detailDefinition[i].entry.length; j++) { // entries
              span("display: block; width: 100%;").textContent = ' • ' + detailDefinition[i].entry[j].word;
            }
          }
        }
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
    if (!isTextSelection || !(e.altKey || keyCode == 45)) return;
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

if (window.frameElement === null) {
  window.addEventListener("DOMContentLoaded", insert);
}