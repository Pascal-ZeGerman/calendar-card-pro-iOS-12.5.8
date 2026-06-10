var assert = require('assert');

/* ── minimal DOM stubs ── */

function makeContainer() {
  var children = [];
  return {
    _children: children,
    get firstChild() { return children[0] || null; },
    removeChild: function (c) {
      var idx = children.indexOf(c);
      if (idx !== -1) children.splice(idx, 1);
    },
    appendChild: function (c) { children.push(c); return c; }
  };
}

function makeElement() {
  return {
    style: { cssText: '' },
    textContent: '',
    _tag: 'div'
  };
}

/* Stub document.createElement */
var globalDoc = {
  createElement: function () { return makeElement(); }
};

/* ── inline _renderMessage (extracted from class method for unit testing) ── */

function renderMessage(container, doc, text) {
  if (!container) return;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  var msg = doc.createElement('div');
  msg.style.cssText = 'padding:16px 8px;color:var(--secondary-text-color);font-size:14px;';
  msg.textContent = text;
  container.appendChild(msg);
}

/* ── tests ── */

/* Basic: message appended with correct text */
var c1 = makeContainer();
renderMessage(c1, globalDoc, 'Calendar data unavailable');
assert.strictEqual(c1._children.length, 1, 'exactly one child appended');
assert.strictEqual(c1._children[0].textContent, 'Calendar data unavailable', 'text content matches');

/* Old content is cleared before new message */
var c2 = makeContainer();
var existing = makeElement();
c2.appendChild(existing);
assert.strictEqual(c2._children.length, 1, 'pre-condition: one existing child');
renderMessage(c2, globalDoc, 'Error');
assert.strictEqual(c2._children.length, 1, 'old child replaced, not accumulated');
assert.strictEqual(c2._children[0].textContent, 'Error', 'new message text correct');

/* Null container is a no-op (no crash) */
var noCrash = false;
try {
  renderMessage(null, globalDoc, 'anything');
  noCrash = true;
} catch (e) {
  noCrash = false;
}
assert.ok(noCrash, 'null container does not throw');

/* Style includes secondary-text-color token */
var c3 = makeContainer();
renderMessage(c3, globalDoc, 'msg');
assert.ok(
  c3._children[0].style.cssText.indexOf('secondary-text-color') !== -1,
  'style includes --secondary-text-color'
);

console.log('PASS: all _renderMessage tests');
