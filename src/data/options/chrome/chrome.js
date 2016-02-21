var background = {
  send: function (id, data) {
    chrome.runtime.sendMessage({path: 'options-to-background', method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.path == 'background-to-options') {
        if (request.method == id) {
          callback(request.data);
        }
      }
    });
  }
};