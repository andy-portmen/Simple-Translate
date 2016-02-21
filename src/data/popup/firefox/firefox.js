var background = {
  send: function (id, data) {
    self.port.emit(id, data);
  },
  receive: function (id, callback) {
    self.port.on(id, callback);
  }
};

self.port.on("show", function () {
  window.postMessage({path: "google-translator-popup-init"}, '*');
  document.getElementById("question-input").focus();
});

var doResize = function () {
  self.port.emit("resize", {
    w: document.body.getBoundingClientRect().width,
    h: document.body.getBoundingClientRect().height
  });
}

window.addEventListener("resize", doResize, false);

window.addEventListener("mousedown", function (e) {
  if (e.button === 2) { /* copy text to clipboard on right-click */
    var target = e.target || e.originalTarget;
    var selectedText = target.ownerDocument.getSelection() + '';
    var link = target.href || target.src;
    if (target.localName != "a" && target.parentNode && target.parentNode.localName == "a") {
      link = target.parentNode.href || link;
    }
    var text = selectedText || link;
    background.send("copy-to-clipboard", text);
  }
});