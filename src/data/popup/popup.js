/********/
var background = {};
if (typeof chrome !== 'undefined') {
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
    $("question-input").focus();
  }, 100);
}
else {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  self.port.on("show", function () {
    $("question-input").focus();
  });
}
/********/

function $ (id) {
  return document.getElementById(id);
}

$('tab-1').style.display = 'block';
$('tab-2').style.display = 'none';

$('fromto-td').addEventListener('click', function () {
    background.send("toggle-request");
}, false);

$('open-define-td').addEventListener('click', function () {
    background.send("open-page", {
      page: 'define', 
      word: $("question-input").value.split(">>")[0]
    });
}, false);

$('settings-td').addEventListener('click', function () {
    background.send("open-page", {
     page: 'settings'
   });
}, false);

function onClick() {
  $("answer-input").value = '';
  $('get-more-definition-td').removeAttribute('state');
  var word = $("question-input").value;
  if (!word) return;
  var toSelect = $("to-select");
  var value = toSelect.children[toSelect.selectedIndex].getAttribute("value");
  if (!value) {$("answer-input").value = "select your language!";}
  else {
    background.send("translation-request", word);
    $("answer-input").setAttribute('state', 'loading');
  }
  $("question-input").select();
  $("question-td").style.opacity = 1.0;
}

$("history-select").addEventListener("change", function (e) {
  var target = e.target || e.originalTarget;
  $('question-input').value = target.children[target.selectedIndex].getAttribute("value");
  onClick();
}, false);

$("translate-td").addEventListener("click", onClick, false);

$("question-input").addEventListener("keydown", function (e) {
  if (e.keyCode === 13) {onClick();}
}, false);

$("get-more-definition-td").addEventListener("click", function (e) {
  if ($("get-more-definition-td").getAttribute('state') == 'show') {
    $('tab-1').style.display = 'none';
    $('tab-2').style.display = 'block';
  }
}, false);

$("close-tab-td").addEventListener("click", function (e) {
  $('tab-1').style.display = 'block';
  $('tab-2').style.display = 'none';
  $("question-input").select();
}, false);

// Message Passing Between Background and Popup
var wrongWord = '';
background.receive("translation-response", function (obj) {
  $("answer-input").removeAttribute('state');
  $('more-definition-div').innerHTML = "";
  if (obj.wordIsCorrect) {
    if (wrongWord) {$("question-input").value = wrongWord + " >> " + obj.word;}
    else {$("question-input").value = obj.word;}
    wrongWord = '';
    $("question-input").select();
    $("question-td").style.opacity = 1.0;
    $("answer-input").value = obj.definition;
    if ($("from-select").children[$("from-select").selectedIndex].value == 'auto' && obj.sourceLang) {
      $("from-select").children[$("from-select").selectedIndex].textContent = 'Auto (' + obj.sourceLang + ')';
    }
    if (obj.detailDefinition) {
      var div = $('more-definition-div');
      var detailDefinition = obj.detailDefinition; 
      if (detailDefinition.length > 0) {
        $('get-more-definition-td').setAttribute('state', 'show');
        for (var i = 0; i < detailDefinition.length; i++) {
          var span = document.createElement('span');
          var br = document.createElement('br');
          span.textContent = detailDefinition[i].pos + ': ';
          span.style.fontWeight = 'bold';
          div.appendChild(span);
          div.appendChild(br);  
          if (detailDefinition[i].entry) {
            for (j = 0; j < detailDefinition[i].entry.length; j++) {
              var span = document.createElement('span');
              var br = document.createElement('br');
              span.textContent = ' (' + (j + 1) + ') ' + detailDefinition[i].entry[j].word;
              div.appendChild(span);
              div.appendChild(br); 
            }
          }
          var br = document.createElement('br');
          div.appendChild(br); 
        }
      }
    }
  } else {
    background.send("translation-request", obj.correctedWord);
    $("answer-input").value = "spell check";
    $("answer-input").setAttribute('state', 'loading');
    wrongWord = obj.word;
  }
})
;
background.receive("history-update", function (obj) {
  var historySelect = $("history-select");
  while (historySelect.firstChild) { // Remove history from drop-down list
    historySelect.removeChild(historySelect.firstChild);
  }
  function addNewItem(word, definition, index) {
    var option = document.createElement("option");
    option.textContent = word + ": " + definition;
    option.setAttribute("value", word);
    if (index == 0) {
      option.textContent = "- Please Select -";
      option.setAttribute("value", "");
    }
    historySelect.appendChild(option);
  }
  addNewItem('', '', 0);
  obj.reverse().forEach(function (o, i) { // Store 10 items in pop-up list
    if (i > 9) {return;}
    addNewItem(o[0], o[1], i + 1);
  });
  if (!obj.length) { // If the list is empty
    var option = document.createElement("option");
    option.textContent = "empty";
    option.setAttribute("disabled", true);
    historySelect.appendChild(option);
  }
});

$('from-select').addEventListener("change", function (e) {
  var from = e.target.children[e.target.selectedIndex].value;
  background.send("change-from-select-request", from);
}, false);
$('to-select').addEventListener("change", function (e) {
  var to = e.target.children[e.target.selectedIndex].value;
  background.send("change-to-select-request", to);
}, false);

// Initialization
background.send("initialization-request");
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
});
