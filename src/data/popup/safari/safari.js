var background = (function () {
  var callbacks = {};
  return {
    send: function (id, data) {
      safari.extension.globalPage.contentWindow.app.popup.dispatchMessage(id, data);
    },
    receive: function (id, callback) {
      callbacks[id] = callback;
    },
    dispatchMessage: function (id, data) {
      if (callbacks[id]) {
        callbacks[id](data);
      }
    }
  }
})();

var doResize = function () {
  safari.self.width = document.body.getBoundingClientRect().width + 10;
  safari.self.height = document.body.getBoundingClientRect().height + 10;
}

window.addEventListener("resize", doResize, false);

safari.application.addEventListener("popover", function (){
  window.setTimeout(function () {
    window.postMessage({path: "google-translator-popup-init"}, '*');
    document.getElementById("question-input").focus();
  }, 170);
}, false);