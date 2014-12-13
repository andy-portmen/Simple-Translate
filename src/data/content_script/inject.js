var background = {}, manifest = {};

/**** wrapper (start) ****/
if (typeof self !== 'undefined' && self.port) { /* Firefox */
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  manifest.url = "resource://jid1-dgnibwqga0sibw-at-jetpack/igtranslator/";
}
else if (typeof safari !== 'undefined') { /* Safari */
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
else {  /* Chrome */
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
  var isTextSelection   = false;
  var isDblclick        = false;
  var isTranslateIcon   = false;
  var translateInputArea = true;
  var isMouseOverTranslation = false;
  var allowMouseOverTranslation = true;
  var translateIconShow = 0;
  var translateIconTime = 3;
  
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
    if (range.startOffset != range.endOffset) {
      var rect = range.getBoundingClientRect();
      return rect;
    }
    else {
      var arr = range.startContainer.childNodes;   
      for (var i = 0; i < arr.length; i++) {
        var target = arr[i].nodeName.toLowerCase();
        if (target == 'textarea' || target == 'input') {
          var rect = getTextBoundingRect(arr[i], arr[i].selectionStart, arr[i].selectionEnd); 
          if (rect.top && rect.left && rect.height && rect.width) return rect;
        }
      } 
      range.collapse(false);
      var dummy = document.createElement("span");
      range.insertNode(dummy);
      var rect = dummy.getBoundingClientRect();
      dummy.parentNode.removeChild(dummy);
      return rect;
    }
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
    header.style.width = (150) + "px";
    header.parentNode.style.backgroundImage = "url(" + manifest.url + "data/content_script/loading.gif)";
    content.style.display = "none";
    allowMouseOverTranslation = false;
    background.send("translation-request", requestBubbleTranslation.text);
  }
  
  var timeoutIconShow, timeoutIconHide;
  function showTranslateIcon() {
    var rect = requestBubbleTranslation.rect;
    translateIcon.style.top = (rect.top + window.scrollY - 18) + 'px';
    translateIcon.style.left = (rect.left + window.scrollX + rect.width - 2) + 'px';
    if (timeoutIconShow) window.clearTimeout(timeoutIconShow);
    if (timeoutIconHide) window.clearTimeout(timeoutIconHide);
    timeoutIconShow = window.setTimeout(function () {
      translateIcon.style.display = "block";
    }, translateIconShow * 1000); /* show TranslateIcon with delay */
    timeoutIconHide = window.setTimeout(function () {
      translateIcon.style.display = "none";
    }, translateIconTime * 1000); /* hide TranslateIcon automatically */
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
      header = html("pre", {dir: "auto"}, html("td", {
        colspan: 4,
        "class": "igtranslator-header"
      }, html("tr", {}, bubble)));
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
  background.receive("context-menu-reload-page", function (url) {
    document.location.href = url;
  });  
  
  background.receive("translation-response", function (data) {
    iFrame.style.width = "600px";
    iFrame.style.height = "300px";
    if (!data.wordIsCorrect && data.correctedWord) {
      background.send("translation-request", data.correctedWord);
    }
    else {
      word = data.word;
      definition = data.definition;
      header.parentNode.style.backgroundImage = "none";
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
        header.style.textAlign = "center";
        header.style.width = "auto";
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
              if (entry.reverse_translation) {
                reverse_translation.textContent = entry.reverse_translation.join(", "); 
                dir(reverse_translation);
              }
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
        /* delete content section if there is nothing to show */
        if (!flag1 && !flag2 && !flag3) {
          content.style.display = "none";
          header.style.fontSize = "100%";
          header.style.width = "450px";
          if (header.textContent.length > 50) {
            header.style.textAlign = "justify";
          }
        }
      }
    }
    var W = window.getComputedStyle(bubble, null).getPropertyValue("width");
    var H = window.getComputedStyle(bubble, null).getPropertyValue("height");
    iFrame.style.width = (parseInt(W) + 20) + "px";
    iFrame.style.height = (parseInt(H) + 20) + "px";
    function smoothScrollTo(duration) {
      var factor = 0, timer, start = Date.now();
      if (timer) window.clearInterval(timer);
      smoothScroll = {
        scrollTo: true,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };
      function step() {
        factor = (Date.now() - start) / duration;
        var left = iFrame.offsetLeft;
        var width = iFrame.offsetWidth;
        window.scrollTo(window.scrollX + factor * parseInt(W), window.scrollY);
        if (window.pageXOffset + window.innerWidth > left + width) {
          window.clearInterval(timer);
          factor = 1;
          return;
        }
      }
      timer = window.setInterval(step, 10);
    }
    if (!isMouseOverTranslation && iFrame.offsetLeft > window.innerWidth - parseInt(W)) {
      smoothScrollTo(800);
    }
    allowMouseOverTranslation = true;
  });
  
  var smoothScroll = {};
  function hideBubble(e) {
    var target = e.target || e.originalTarget;
    while (target.parentNode && target.getAttribute) {
      if (target == bubble || target == translateIcon) {
        return; /* Do not hide the panel when user clicks inside the panel */
      }
      target = target.parentNode;
    }
    translateIcon.style.display = 'none';
    iFrame.style.display = 'none';
    iFrame.style.width = (0) + "px";
    iFrame.style.height = (0) + "px";
    if (smoothScroll.scrollTo) {
      window.scrollTo(smoothScroll.scrollX, smoothScroll.scrollY);
      smoothScroll = {
        scrollTo: false,
        windowScrollX: 0,
        windowScrollY: 0
      };
    }
  }
  document.addEventListener('mousedown', hideBubble, false); 
  document.addEventListener('keydown', function (e) {
    keyCode = e.keyCode;
    if (!e.metaKey && !e.altKey && keyCode != 45 && keyCode != 84) {
      hideBubble(e);
    }
  }, false); 
  
  document.addEventListener('keyup', function (e) {
    keyCode = null;
  }, false);
  
  function getSelectedText(target) {
    function getTextSelection() {
      var selectedText = '';
      var value = target.value;
      var startPos = target.selectionStart;
      var endPos = target.selectionEnd;        
      if (value && startPos && endPos) selectedText = value.substring(startPos, endPos);
      return selectedText;
    }
    var selectedText = window.getSelection().toString();
    if (!selectedText) selectedText = getTextSelection();
    return selectedText;
  }
  
  function getWordAtPoint(elem, x, y) {
    if (elem && elem.nodeType == elem.TEXT_NODE) {
      var range = elem.ownerDocument.createRange();
      range.selectNodeContents(elem);
      var currentPos = 0;
      var endPos = range.endOffset;
      while(currentPos+1 < endPos) {
        range.setStart(elem, currentPos);
        range.setEnd(elem, currentPos+1);
        if(range.getBoundingClientRect().left <= x && range.getBoundingClientRect().right  >= x &&
           range.getBoundingClientRect().top  <= y && range.getBoundingClientRect().bottom >= y) {
          range.expand("word");
          var originalRange = range;
          range.detach();
          return (originalRange);
        }
        currentPos += 1;
      }
    } else {
      for(var i = 0; i < elem.childNodes.length; i++) {
        var range = elem.childNodes[i].ownerDocument.createRange();
        range.selectNodeContents(elem.childNodes[i]);
        if(range.getBoundingClientRect().left <= x && range.getBoundingClientRect().right  >= x &&
           range.getBoundingClientRect().top  <= y && range.getBoundingClientRect().bottom >= y) {
          range.detach();
          return (getWordAtPoint(elem.childNodes[i], x, y));
        } 
        else {
          range.detach();
        }
      }
    }
    return (null);
  }    
  
  function triggerTranslation(e) {
    var target = e.target || e.originalTarget;
    
    /* detect input or editable areas */
    var flag1 = (target.localName == "input" || target.localName == "textarea");
    var flag2 = (target.getAttribute('contenteditable') == 'true');
    var flag3 = (target.className.indexOf("editable") != -1);
    var inputArea = flag1 || flag2 || flag3;
    if (inputArea && !translateInputArea) return;
    
    var keyboard = e.metaKey || e.altKey || keyCode == 45 || keyCode == 84;
    var dblclick = (e.type == 'dblclick') && isDblclick;
    var mouseup = (e.type == 'mouseup') && isTextSelection && keyboard;
    
    if (false) {
      var range = getWordAtPoint(e.target, e.x, e.y);
      if (range) {
        var selectedText = range.toString();
        requestBubbleTranslation.text = selectedText;
        requestBubbleTranslation.rect = range.getBoundingClientRect();
        if (allowMouseOverTranslation) {
          if (selectedText && selectedText.length > 2) {
            requestBubbleTranslation();
          }
        }
      }
    }
    else { /* dblclick or mouseup translations */
      var selectedText = getSelectedText(target);
      if (selectedText && selectedText.length > 2) {
        requestBubbleTranslation.text = selectedText;
        requestBubbleTranslation.rect = getSelectedRect(window.getSelection());
        if (isTranslateIcon && iFrame.style.display == 'none') {
          showTranslateIcon();
        }
        else if (dblclick || mouseup) {
          requestBubbleTranslation();
        }
      }
    }
  }

  /* adding listeners for mouseup and dblclick */
  document.addEventListener('mouseup', triggerTranslation, false);
  document.addEventListener('dblclick', triggerTranslation, false);
  
  /* Get options at start-up */
  background.send("options-request", null);
  background.receive("options-response", function (data) {
    isTextSelection = data.isTextSelection;
    isDblclick = data.isDblclick;
    isTranslateIcon = data.isTranslateIcon;
    translateIconShow = data.translateIconShow;
    translateIconTime = data.translateIconTime;
    translateInputArea = data.translateInputArea;
    isMouseOverTranslation = data.isMouseOverTranslation;
    
    /*
    if (isMouseOverTranslation) {
      document.addEventListener('mouseOverTranslation', triggerTranslation, false);
    }
    else {
      document.removeEventListener('mouseOverTranslation', triggerTranslation, false);
    }
    */
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

/* Get bounding rectangle for text or input area */
function getTextBoundingRect(input, selectionStart, selectionEnd, debug) {
  // @author Rob W         http://stackoverflow.com/users/938089/rob-w
  // @name                 getTextBoundingRect
  // @param input          Required HTMLElement with `value` attribute
  // @param selectionStart Optional number: Start offset. Default 0
  // @param selectionEnd   Optional number: End offset. Default selectionStart
  // @param debug          Optional boolean. If true, the created test layer will not be removed.

  // Basic parameter validation
  if (!input || !('value' in input)) return input;
  if (typeof selectionStart == "string") selectionStart = parseFloat(selectionStart);
  if (typeof selectionStart != "number" || isNaN(selectionStart)) {
    selectionStart = 0;
  }
  if (selectionStart < 0) selectionStart = 0;
  else selectionStart = Math.min(input.value.length, selectionStart);
  if (typeof selectionEnd == "string") selectionEnd = parseFloat(selectionEnd);
  if (typeof selectionEnd != "number" || isNaN(selectionEnd) || selectionEnd < selectionStart) {
    selectionEnd = selectionStart;
  }
  if (selectionEnd < 0) selectionEnd = 0;
  else selectionEnd = Math.min(input.value.length, selectionEnd);

  // If available (thus IE), use the createTextRange method
  if (typeof input.createTextRange == "function") {
    var range = input.createTextRange();
    range.collapse(true);
    range.moveStart('character', selectionStart);
    range.moveEnd('character', selectionEnd - selectionStart);
    return range.getBoundingClientRect();
  }
  // createTextRange is not supported, create a fake text range
  var offset = getInputOffset(),
    topPos = offset.top,
    leftPos = offset.left,
    width = getInputCSS('width', true),
    height = getInputCSS('height', true);

  // Styles to simulate a node in an input field
  var cssDefaultStyles = "white-space:pre;padding:0;margin:0;", listOfModifiers = ['direction', 'font-family', 'font-size', 'font-size-adjust', 'font-variant', 'font-weight', 'font-style', 'letter-spacing', 'line-height', 'text-align', 'text-indent', 'text-transform', 'word-wrap', 'word-spacing'];
  topPos += getInputCSS('padding-top', true);
  topPos += getInputCSS('border-top-width', true);
  leftPos += getInputCSS('padding-left', true);
  leftPos += getInputCSS('border-left-width', true);
  leftPos += 1; //Seems to be necessary

  for (var i=0; i<listOfModifiers.length; i++) {
    var property = listOfModifiers[i];
    cssDefaultStyles += property + ':' + getInputCSS(property) +';';
  }
  // End of CSS variable checks

  var text = input.value, textLen = text.length, fakeClone = document.createElement("div");
  if (selectionStart > 0) appendPart(0, selectionStart);
  var fakeRange = appendPart(selectionStart, selectionEnd);
  if (textLen > selectionEnd) appendPart(selectionEnd, textLen);

  // Styles to inherit the font styles of the element
  fakeClone.style.cssText = cssDefaultStyles;

  // Styles to position the text node at the desired position
  fakeClone.style.position = "absolute";
  fakeClone.style.top = topPos + "px";
  fakeClone.style.left = leftPos + "px";
  fakeClone.style.width = width + "px";
  fakeClone.style.height = height + "px";
  document.body.appendChild(fakeClone);
  var returnValue = fakeRange.getBoundingClientRect(); //Get rect

  if (!debug) fakeClone.parentNode.removeChild(fakeClone); //Remove temp
  return returnValue;

  // Local functions for readability of the previous code
  function appendPart(start, end){
    var span = document.createElement("span");
    span.style.cssText = cssDefaultStyles; //Force styles to prevent unexpected results
    span.textContent = text.substring(start, end);
    fakeClone.appendChild(span);
    return span;
  }
  // Computing offset position
  function getInputOffset(){
    var body = document.body, win = document.defaultView, docElem = document.documentElement, box = document.createElement('div');
    box.style.paddingLeft = box.style.width = "1px";
    body.appendChild(box);
    var isBoxModel = box.offsetWidth == 2;
    body.removeChild(box);
    box = input.getBoundingClientRect();
    var clientTop  = docElem.clientTop  || body.clientTop  || 0,
        clientLeft = docElem.clientLeft || body.clientLeft || 0,
        scrollTop  = win.pageYOffset || isBoxModel && docElem.scrollTop  || body.scrollTop,
        scrollLeft = win.pageXOffset || isBoxModel && docElem.scrollLeft || body.scrollLeft;
    return {
      top : box.top  + scrollTop  - clientTop,
      left: box.left + scrollLeft - clientLeft
    };
  }
  function getInputCSS(prop, isnumber){
    var val = document.defaultView.getComputedStyle(input, null).getPropertyValue(prop);
    return isnumber ? parseFloat(val) : val;
  }
}