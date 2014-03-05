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

// Make a bubble at startup
var bubbleDOM = document.createElement('div');
bubbleDOM.setAttribute('class', 'selection_bubble');
bubbleDOM.setAttribute('id', 'bubble_container');
document.body.appendChild(bubbleDOM);
bubbleDOM.style.visibility = 'hidden';

document.addEventListener('dblclick', function (e) {
  var target = e.target || e.originalTarget;
  var selectedText = window.getSelection().toString();
  if (target.localName == 'input' && target.getAttribute('type') == 'text') return;
  if (selectedText.length > 2) {
    requestBubbleTranslation(e.clientX + window.scrollX, e.clientY + window.scrollY, selectedText);
  }
}, false);

document.addEventListener('mouseup', function (e) {
  if (!e.altKey) return;
  var selectedText = window.getSelection().toString();
  if (selectedText.length > 2) {
    requestBubbleTranslation(e.clientX + window.scrollX, e.clientY + window.scrollY, selectedText);
  }
}, false);

document.addEventListener('mousedown', function (e) {
  bubbleDOM.style.visibility = 'hidden';
}, false);

function requestBubbleTranslation(mouseX, mouseY, selected_text) {
  bubbleDOM.style.top = (mouseY + 16) + 'px';
  bubbleDOM.style.left = mouseX + 'px';
  bubbleDOM.style.visibility = 'visible';
  bubbleDOM.textContent = '...';
  background.send("translation-request", selected_text);
}

background.receive("translation-response", function (data) {
  bubbleDOM.textContent = data.definition;
});