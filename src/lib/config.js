if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var os = require("sdk/system").platform;
  config = exports;
}
else {
  var config = {};
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
    return app.storage.read("exclude") || 'https://translate.google.com/m/*, http://translate.google.com/m/*, *.xml';
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
    return parseInt(app.storage.read("numberHistoryItems") || "100");
  },
  set number (val) {
    val = parseInt(val);
    if (val < 0) val = 0;
    app.storage.write("numberHistoryItems", val + '');
  }
}

config.welcome = {
  get version () {
    return app.storage.read("version");
  },
  set version (val) {
    app.storage.write("version", val);
  },
  timeout: 3
}

/* Firefox UI */
config.ui = {
  badge: true,
  get fontFamily () {
    if (os === "darwin") return "sans-serif";
    if (os === "linux") return "\"Liberation Sans\", FreeSans, Arial, Sans-serif";
    return "Arial";
  },
  get fontSize () {
    if (os === "darwin") return "8px";
    return "10px";
  },
  get height () {
    if (os === "darwin") return "10px";
    return "11px";
  },
  get lineHeight () {
    if (os === "linux") return "11px";
    return "10px";
  },
  backgroundColor: "#3366CC",
  color: "#fff",
  margin: {
    get "1" () {  // badge length of "1"
      if (os === "darwin") return "-10px -13px 0 0";
      if (os === "linux") return "7px 3px 0 -13px";
      return "7px 3px 0 -13px";
    },
    get "2" () {
      if (os === "darwin") return "-10px -14px 0 0";
      if (os === "linux") return "7px 3px 0 -19px";
      return "7px 3px 0 -19px";
    },
    get "3" () {
      if (os === "darwin") return "-10px -14px 0 -7px";
      if (os === "linux") return "7px 4px 0 -26px";
      return "7px 3px 0 -23px";
    },
    get "4" () {
      if (os === "darwin") return "-10px -14px 0 -13px";
      if (os === "linux") return "7px 2px 0 -30px";
      return "7px 3px 0 -27px";
    }
  },
  width: {
    get "1" () { // badge width of "1"
      return "10px";
    },
    get "2" () {
      if (os === "darwin") return "12px";
      return "16px";
    },
    get "3" () {
      if (os === "darwin") return "19px";
      return "20px";
    },
    get "4" () {
      if (os === "darwin") return "21px";
      return "22px";
    }
  },
  get extra ()  {
    if (os === "darwin") {
      return "__id__:moz-window-inactive:after {background-color: #99B2E5}";
    }
    if (os === "linux") {
      return "__id__:after {padding-top: 1px; letter-spacing: -0.05ex;}";
    }
    return "";
  }
}

// Complex get and set
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
