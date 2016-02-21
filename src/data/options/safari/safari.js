var background;

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

document.addEventListener('contextmenu', function () {
  var selectedText = window.getSelection().toString();
  try {
    safari.self.tab.setContextMenuEventUserInfo(event, {selectedText: selectedText});
  } 
  catch (e) {}
}, false);