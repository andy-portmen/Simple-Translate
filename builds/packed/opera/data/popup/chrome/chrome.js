var background = {
  send: function (id, data) {
    chrome.runtime.sendMessage({path: 'popup-to-background', method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.path == 'background-to-popup') {
        if (request.method == id) {
          callback(request.data);
        }
      }
    });
  }
};

window.postMessage({path: "google-translator-popup-init"}, '*');
document.getElementById("question-input").focus();
var doResize = function () {};