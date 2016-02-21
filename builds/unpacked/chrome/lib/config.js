var config = {};

config.welcome = {
  get version () {
    return app.storage.read("version");
  },
  set version (val) {
    app.storage.write("version", val);
  },
  timeout: 3
}

config.translator = {
  get from () {
    return app.storage.read("from") || "auto";
  },
  set from (val) {
    app.storage.write("from", val);
  },
  get to () {
    return app.storage.read("to") || "en";
  },
  set to (val) {
    app.storage.write("to", val);
  },
  get alt () {
    return app.storage.read("alt") || "en";
  },
  set alt (val) {
    app.storage.write("alt", val);
  },
  get useCache () {
    return app.storage.read("useCache") || "true";
  },
  set useCache (val) {
    app.storage.write("useCache", val);
  },
  get width () {
    return parseInt(app.storage.read("popupWidth") || "450");
  },
  set width (val) {
    if (!val || isNaN(val)) val = 450;
    val = parseInt(val);
    if (val < 300) val = 300;
    if (val > 700) val = 700;
    app.storage.write("popupWidth", val);
  },
  get height () {
    return parseInt(app.storage.read("popupHeight") || "170");
  },
  set height (val) {
    if (!val || isNaN(val)) val = 170;
    val = parseInt(val);
    if (val < 100) val = 100;
    if (val > 510) val = 510;
    app.storage.write("popupHeight", val);
  }
}

config.settings = {
  get exclude () {
    return app.storage.read("exclude") || 'https://translate.google.com/*, http://translate.google.com/*, *.xml';
  },
  set exclude (val) {
    val = val.split(/\s*\,\s*/)
    .map(function (a) {
      return a.trim();
    })
    .filter(function (a) {
      return a;
    })
    .filter(function (a, i, l) {
      return l.indexOf(a) === i;
    }).join(', ');
    app.storage.write("exclude", val);
  },
  get selection () {
    return app.storage.read("isTextSelection") || "false";
  },
  set selection (val) {
    app.storage.write("isTextSelection", val);
  },
  get dbClick () {
    return app.storage.read("isDblclick") || "false";
  },
  set dbClick (val) {
    app.storage.write("isDblclick", val);
  },
  get showIcon () {
    return app.storage.read("isTranslateIcon") || "true";
  },
  set showIcon (val) {
    app.storage.write("isTranslateIcon", val);
  },
  get mouseOverTranslation () {
    return app.storage.read("isMouseOverTranslation") || "false";
  },
  set mouseOverTranslation (val) {
    app.storage.write("isMouseOverTranslation", val);
  },
  get translateInputArea () {
    return app.storage.read("translateInputArea") || "true";
  },
  set translateInputArea (val) {
    app.storage.write("translateInputArea", val);
  },
  get translateInNewTab () {
    return app.storage.read("translateInNewTab") || "true";
  },
  set translateInNewTab (val) {
    app.storage.write("translateInNewTab", val);
  },
  get translateIconTime () {
    return parseInt(app.storage.read("translateIconTime") || "5");
  },
  set translateIconTime (val) {
    val = parseInt(val);
    if (val < 1) val = 1;
    app.storage.write("translateIconTime", val);
  },
  get translateIconShow () {
    return parseInt(app.storage.read("translateIconShow") || "0");
  },
  set translateIconShow (val) {
    val = parseInt(val);
    if (val < 0) val = 0;
    app.storage.write("translateIconShow", val);
  },
  get contextMenu () {
    return app.storage.read("showContextMenu") || "true";
  },
  set contextMenu (val) {
    app.storage.write("showContextMenu", val);
  },
  get minimumNumberOfCharacters () {
    return parseInt(app.storage.read("minimumNumberOfCharacters") || "3");
  },
  set minimumNumberOfCharacters (val) {
    val = parseInt(val);
    if (val < 1) val = 1;
    app.storage.write("minimumNumberOfCharacters", val);
  },
  get bubbleRGB () {
    return app.storage.read("bubbleRGB") || "rgb(222, 184, 135)";
  },
  set bubbleRGB (val) {
    if (val.indexOf("rgb(") == -1 || val.indexOf(")") == -1) {
      val = "rgb(222, 184, 135)";
    }
    app.storage.write("bubbleRGB", val);
  }
}

config.history = {
  get data () {
    return JSON.parse(app.storage.read("history") || "[]");
  },
  set data (val) {
    app.storage.write("history", JSON.stringify(val));
  },
  get enable () {
    return app.storage.read("enableHistory") || "true";
  },
  set enable (val) {
    app.storage.write("enableHistory", val);
  },
  get number () {
    return parseInt(app.storage.read("numberHistoryItems") || "20");
  },
  set number (val) {
    val = parseInt(val);
    if (val < 0) val = 0;
    app.storage.write("numberHistoryItems", val + '');
  }
}

config.get = function (name) {
  return name.split(".").reduce(function(p, c) {
    return p[c]
  }, config);
}

config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split(".");
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join("."), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
}