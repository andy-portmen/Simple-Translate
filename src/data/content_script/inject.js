/********/
var background = {};
if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
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
}
/********/
// Filter out iFrame window
console.error(88787, window.frameElement === null)
if (window.frameElement === null) {
  // Make a bubble at startup
  var isTextSelection = false;
  var isDblclick = false;
  var bubbleDOM = document.createElement('div');
  bubbleDOM.setAttribute('class', 'selection_bubble');
  bubbleDOM.setAttribute('id', 'bubble_container');
  document.body.appendChild(bubbleDOM);
  bubbleDOM.style.visibility = 'hidden';

  // Get options at Startup
  background.send("options-request", null);
  background.receive("options-response", function (data) {
    isTextSelection = data.isTextSelection;
    isDblclick = data.isDblclick;
  });

  function requestBubbleTranslation(mouseX, mouseY, selectedText) {
    bubbleDOM.style.top = (mouseY + 16) + 'px';
    bubbleDOM.style.left = mouseX + 'px';
    bubbleDOM.style.visibility = 'visible';
    bubbleDOM.textContent = '...';
    background.send("translation-request", selectedText);
  }

  background.receive("translation-response", function (data) {
    bubbleDOM.textContent = data.definition;
  });

  background.receive("context-menu-request", function () {
    var selectedText = window.getSelection().toString();
    background.send("context-menu-response", selectedText);
  });
  document.addEventListener('mousedown', function (e) {
    bubbleDOM.style.visibility = 'hidden';
  }, false);
  document.addEventListener('mouseup', function (e) {
    if (!isTextSelection || !e.altKey) return;
    var selectedText = window.getSelection().toString();
    if (selectedText.length > 2) {
      requestBubbleTranslation(e.clientX + window.scrollX, e.clientY + window.scrollY, selectedText);
    }
  }, false);
  document.addEventListener('dblclick', function (e) {
    if (!isDblclick) return;
    var target = e.target || e.originalTarget;
    
    var selectedText = window.getSelection().toString();
    if (target.localName == 'input'  || target.getAttribute('contenteditable') == 'true' || target.className.indexOf("editable") != -1) {
      return;
    }
    if (selectedText.length > 2) {
      requestBubbleTranslation(e.clientX + window.scrollX, e.clientY + window.scrollY, selectedText);
    }
  }, false);
  
  
  
}