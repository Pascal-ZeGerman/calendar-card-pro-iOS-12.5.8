/* Browser globals needed to require src-lite/calendar-card-pro.js in Node.js */
global.HTMLElement = class {};
global.document = {
  createElement: function (tag) {
    var el = {
      tagName: tag,
      style: { cssText: '' },
      className: '',
      textContent: '',
      _children: [],
      get firstChild() { return el._children[0] || null; },
      setAttribute: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      appendChild: function (c) { el._children.push(c); return c; },
      removeChild: function (c) {
        var i = el._children.indexOf(c);
        if (i !== -1) el._children.splice(i, 1);
      }
    };
    return el;
  },
  createDocumentFragment: function () {
    return { appendChild: function (c) { return c; } };
  },
  addEventListener: function () {},
  removeEventListener: function () {},
  hidden: false
};
global.customElements = { define: function () {} };
global.window = { customCards: [] };
