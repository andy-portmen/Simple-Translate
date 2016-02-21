var background = {
  send: function (id, data) {
    chrome.runtime.sendMessage({path: 'page-to-background', method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.path == 'background-to-page') {
        if (request.method == id) {
          callback(request.data);
        }
      }
    });
  }
};

var manifest = {
  url: chrome.extension.getURL('./')
};
