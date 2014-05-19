const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const winUtils = require("sdk/deprecated/window-utils");
const browserURL = "chrome://browser/content/browser.xul";

const listen = function listen(window, node, event, func, capture) {
  // Default to use capture
  if (capture == null)
    capture = true;

  node.addEventListener(event, func, capture);
  function undoListen() {
    node.removeEventListener(event, func, capture);
  }

  // Undo the listener on unload and provide a way to undo everything
  let undoUnload = unload(undoListen, window);
  return function() {
    undoListen();
    undoUnload();
  };
}

var Unloader = exports.Unloader = function Unloader() {
  var unloaders = [];

  function unloadersUnlaod() {
    unloaders.slice().forEach(function(unloader) unloader());
    unloaders.length = 0;
  }

  require("sdk/system/unload").when(unloadersUnlaod);

  function removeUnloader(unloader) {
    let index = unloaders.indexOf(unloader);
    if (index != -1)
      unloaders.splice(index, 1);
  }

  return {
    unload: function unload(callback, container) {
      // Calling with no arguments runs all the unloader callbacks
      if (callback == null) {
        unloadersUnlaod();
        return null;
      }

      var remover = removeUnloader.bind(null, unloader);

      // The callback is bound to the lifetime of the container if we have one
      if (container != null) {
        // Remove the unloader when the container unloads
        container.addEventListener("unload", remover, false);

        // Wrap the callback to additionally remove the unload listener
        let origCallback = callback;
        callback = function() {
          container.removeEventListener("unload", remover, false);
          origCallback();
        }
      }

      // Wrap the callback in a function that ignores failures
      function unloader() {
        try {
          callback();
        }
        catch(ex) {}
      }
      unloaders.push(unloader);

      // Provide a way to remove the unloader
      return remover;
    }
  };
}

const unload = (Unloader()).unload;

exports.ToolbarButton = function ToolbarButton(options) {
  var unloaders = [],
      toolbarID = "",
      insertbefore = "",
      destroyed = false,
      destoryFuncs = [];

  var delegate = {
    onTrack: function (window) {
      if ("chrome://browser/content/browser.xul" != window.location || destroyed)
        return;

      let doc = window.document;
      function $(id) doc.getElementById(id);
      function xul(type) doc.createElementNS(NS_XUL, type);

      // create toolbar button
      let tbb = xul("toolbarbutton");
      tbb.setAttribute("id", options.id);
      tbb.setAttribute("type", "button");
      if (options.image) tbb.setAttribute("image", options.image);
      tbb.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
      tbb.setAttribute("label", options.label);
      tbb.addEventListener("command", function() {
        if (options.onCommand)
          options.onCommand({}); // TODO: provide something?

        if (options.panel) {
          options.panel.show(tbb);
        }
      }, true);

      // add toolbarbutton to palette
      ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(tbb);

      // find a toolbar to insert the toolbarbutton into
      if (toolbarID) {
        var tb = $(toolbarID);
      }
      if (!tb) {
        var tb = toolbarbuttonExists(doc, options.id);
      }

      // found a toolbar to use?
      if (tb) {
        let b4;

        // find the toolbarbutton to insert before
        if (insertbefore) {
          b4 = $(insertbefore);
        }
        if (!b4) {
          let currentset = tb.getAttribute("currentset").split(",");
          let i = currentset.indexOf(options.id) + 1;

          // was the toolbarbutton id found in the curent set?
          if (i > 0) {
            let len = currentset.length;
            // find a toolbarbutton to the right which actually exists
            for (; i < len; i++) {
              b4 = $(currentset[i]);
              if (b4) break;
            }
          }
        }

        tb.insertItem(options.id, b4, null, false);
      }

      var saveTBNodeInfo = function(e) {
        toolbarID = tbb.parentNode.getAttribute("id") || "";
        insertbefore = (tbb.nextSibling || "")
            && tbb.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");
      };

      window.addEventListener("aftercustomization", saveTBNodeInfo, false);

      // add unloader to unload+'s queue
      var unloadFunc = function() {
        tbb.parentNode.removeChild(tbb);
        window.removeEventListener("aftercustomization", saveTBNodeInfo, false);
      };
      var index = destoryFuncs.push(unloadFunc) - 1;
      listen(window, window, "unload", function() {
        destoryFuncs[index] = null;
      }, false);
      unloaders.push(unload(unloadFunc, window));
    },
    onUntrack: function (window) {}
  };
  var winUtils = require("sdk/deprecated/window-utils");
  var tracker = new winUtils.WindowTracker(delegate);

  return {
    destroy: function() {
      if (destroyed) return;
      destroyed = true;

      if (options.panel)
        options.panel.destroy();

      // run unload functions
      destoryFuncs.forEach(function(f) f && f());
      destoryFuncs.length = 0;

      // remove unload functions from unload+'s queue
      unloaders.forEach(function(f) f());
      unloaders.length = 0;
    },
    moveTo: function(pos) {
      if (destroyed) return;

      // record the new position for future windows
      toolbarID = pos.toolbarID;
      insertbefore = pos.insertbefore;

      // change the current position for open windows
      for each (var window in winUtils.windowIterator()) {
        if ("chrome://browser/content/browser.xul" != window.location) return;

        let doc = window.document;
        let $ = function (id) doc.getElementById(id);

        // if the move isn't being forced and it is already in the window, abort
        if (!pos.forceMove && $(options.id)) return;

        var tb = $(toolbarID);
        var b4 = $(insertbefore);

        // TODO: if b4 dne, but insertbefore is in currentset, then find toolbar to right

        if (tb) tb.insertItem(options.id, b4, null, false);
      };
    },
    updateAttributes: function(attributes) {
      var allowedAttributes = ["image", "label"];

      for (var window in winUtils.windowIterator()) {
        var tb = window.document.getElementById(options.id);

        if (tb) {
          for (var attr in attributes) {
            if (allowedAttributes.indexOf(attr) >= 0) {
              tb.setAttribute(attr, attributes[attr]);
            }
          }
        }
      }
    },
    get object () {
      return winUtils.activeBrowserWindow.document.getElementById(options.id);
    }
  };
};

function toolbarbuttonExists(doc, id) {
  var toolbars = doc.getElementsByTagNameNS(NS_XUL, "toolbar");
  for (var i = toolbars.length - 1; ~i; i--) {
    if ((new RegExp("(?:^|,)" + id + "(?:,|$)")).test(toolbars[i].getAttribute("currentset")))
      return toolbars[i];
  }
  return false;
}