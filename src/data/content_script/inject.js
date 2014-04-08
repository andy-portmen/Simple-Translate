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
// Filter-out iFrame window
if (window.frameElement === null) {
  // make a bubble at start-up
  var isTextSelection = false;
  var isDblclick = false;
  var bubbleDOM = document.createElement('div');
  bubbleDOM.setAttribute('class', 'selection_bubble');
  bubbleDOM.setAttribute('id', 'bubble_container');
  var body = document.createElement('div');
  document.body.appendChild(bubbleDOM);
  bubbleDOM.appendChild(body);
  bubbleDOM.style.visibility = 'hidden';

  // Get options at start-up
  background.send("options-request", null);
  background.receive("options-response", function (data) {
    isTextSelection = data.isTextSelection;
    isDblclick = data.isDblclick;
  });

  function requestBubbleTranslation(mouseX, mouseY, selectedText) {
    bubbleDOM.style.top = (mouseY + 16) + 'px';
    bubbleDOM.style.left = mouseX + 'px';
    bubbleDOM.style.visibility = 'visible'; 
    body.style.textAlign = 'center';
    var span = document.createElement('span');
    span.style.fontSize = '130%';
    span.textContent = '...';
    body.appendChild(span);
    background.send("translation-request", selectedText);
  }

  background.receive("translation-response", function (data) {
    body.innerHTML = '';
    body.style.textAlign = 'auto';
    var span = document.createElement('span');
    span.style.fontSize = '130%';
    span.textContent = data.definition || "not found";
    body.appendChild(span);
    if (data.detailDefinition) {
      var detailDefinition = data.detailDefinition; 
      if (detailDefinition.length > 0) {
        var hr = document.createElement('hr');
        var br = document.createElement('br');
        hr.setAttribute('class', 'selection_bubble_line');
        body.style.textAlign = 'left';
        body.appendChild(hr);
        body.appendChild(br);
        for (var i = 0; i < detailDefinition.length; i++) {
          var span = document.createElement('span');
          var br = document.createElement('br');
          span.style.fontSize = '100%';
          span.textContent = detailDefinition[i].pos + ': ';
          span.style.fontWeight = 'bold';
          body.appendChild(span);
          body.appendChild(br);
          if (detailDefinition[i].entry) {
            for (j = 0; j < detailDefinition[i].entry.length; j++) {
              var span = document.createElement('span');
              var br = document.createElement('br');
              span.textContent = '(' + (j + 1) + ') ' + detailDefinition[i].entry[j].word;
              body.appendChild(span);
              body.appendChild(br);
            }
          }
          var br = document.createElement('br');
          body.appendChild(br);
        }
      }
    }
  });

  background.receive("context-menu-request", function () {
    var selectedText = window.getSelection().toString();
    background.send("context-menu-response", selectedText);
  });
  document.addEventListener('mousedown', function (e) {
    bubbleDOM.style.visibility = 'hidden';
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