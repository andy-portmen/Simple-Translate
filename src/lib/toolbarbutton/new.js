exports.ToolbarButton = function (options) {
  var {Cu}   = require('chrome'),
      utils = require('sdk/window/utils');
  Cu.import("resource:///modules/CustomizableUI.jsm");

  var listen = {
    onWidgetBeforeDOMChange: function(tbb, aNextNode, aContainer, aIsRemoval) {
      if (tbb.id != options.id) return;
      
      tbb.addEventListener("command", function(e) {
        if (e.ctrlKey) return;
        if (e.originalTarget.localName == "menu" || e.originalTarget.localName == "menuitem") return;

        if (options.onCommand) {
          options.onCommand(e, tbb);
        }

        if (options.panel) {
          options.panel.show(tbb);
        }
      }, true);
      if (options.onClick) {
        tbb.addEventListener("click", function (e) {
          options.onClick(e, tbb);
          return true;
        });
      }
      if (options.panel) {
        tbb.addEventListener("contextmenu", function (e) {
          e.stopPropagation();
          e.preventDefault();
          try {
            options.panel.show(tbb);
          }
          catch (e) {
            options.panel.show(null, tbb);
          }
        }, true);
      }
      if (options.onContext) {
        const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        
        let doc = tbb.ownerDocument.defaultView.document;
        let menupopup = doc.createElementNS(NS_XUL, "menupopup");
        let menuitem = doc.createElementNS(NS_XUL, "menuitem");
        let menuseparator = doc.createElementNS(NS_XUL, "menuseparator");
        tbb.addEventListener("contextmenu", function (e) {
          e.stopPropagation(); //Prevent Firefox context menu
          e.preventDefault();
          options.onContext(e, menupopup, menuitem, menuseparator);
          menupopup.openPopup(tbb , "after_end", 0, 0, false);
        }, true);
        tbb.appendChild(menupopup);
      }
    }
  }
  CustomizableUI.addListener(listen);

  var getButton = () => utils.getMostRecentBrowserWindow().document.getElementById(options.id);
  var button = CustomizableUI.createWidget({
    id : options.id,
    defaultArea : CustomizableUI.AREA_NAVBAR,
    label : options.label,
    tooltiptext : options.tooltiptext
  });
  
  //Destroy on unload
  require("sdk/system/unload").when(function () {
    CustomizableUI.removeListener(listen);
    CustomizableUI.destroyWidget(options.id);
  });
  
  return {
    destroy: function () {
      CustomizableUI.destroyWidget(options.id);
    },
    moveTo: function () {
    
    },
    get label() button.label,
    set label(value) {
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        tbb.setAttribute("label", value);
      });
    },
    get tooltiptext() button.tooltiptext,
    set tooltiptext(value) {
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        tbb.setAttribute("tooltiptext", value);
      });
    },
    get saturate() options.saturate,
    set saturate(value) {
      options.saturate = value;
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        
        if (!value) {
          tbb.setAttribute("type", "gray");
        }
        else {
          tbb.removeAttribute("type");
        }
      });
    },
    set progress(value) {
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        if (!value) {
          tbb.removeAttribute("progress");
        }
        else {
          tbb.setAttribute("progress", (value * 8).toFixed(0));
        }
      });
    },
    get object () {
      return getButton();
    }
  }
}