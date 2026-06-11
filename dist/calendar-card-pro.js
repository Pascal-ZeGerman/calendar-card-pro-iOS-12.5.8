/**
 * Calendar Card Pro — Vanilla JS edition for Safari 12+ / iOS 12.5.8
 *
 * Zero dependencies. Custom Elements v1 + Shadow DOM v1.
 * ES2015+ (Safari 12 compatible) — no optional chaining, nullish coalescing, or private fields.
 */

/* ================================================
   1. DEFAULTS
   ================================================ */

var DEFAULTS = {
  days_to_show: 7,
  compact_days_to_show: 3,
  show_empty_days: false,
  show_time: true,
  show_end_time: true,
  show_location: true,
  show_month: true,
  show_past_events: false,
  time_24h: 'system',
  accent_color: '#03a9f4',
  vertical_line_width: '2px',
  day_spacing: '10px',
  event_spacing: '4px',
  refresh_interval: 30,
  additional_card_spacing: '0px',
  background_color: 'var(--ha-card-background, var(--card-background-color))',
  weekday_color: 'var(--primary-text-color)',
  day_color: 'var(--primary-text-color)',
  month_color: 'var(--primary-text-color)',
  event_color: 'var(--primary-text-color)',
  time_color: 'var(--secondary-text-color)',
  location_color: 'var(--secondary-text-color)',
  weekday_font_size: '14px',
  day_font_size: '26px',
  month_font_size: '12px',
  event_font_size: '14px',
  time_font_size: '12px',
  location_font_size: '12px',
  location_icon_size: '14px',
  time_icon_size: '14px',
  date_vertical_alignment: 'middle'
};

/* ================================================
   2. STYLES (Safari 12-safe CSS)
   ================================================ */

function buildStyles(cfg) {
  var dateColWidth = (parseFloat(cfg.day_font_size) * 1.75) + 'px';
  var borderRadius = '5px'; /* fallback for calc(var(--ha-card-border-radius,10px)/2) */

  return ''
    + ':host { display: block; height: 100%; }'

    + 'ha-card {'
    + '  display: -webkit-flex; display: flex;'
    + '  -webkit-flex-direction: column; flex-direction: column;'
    + '  height: 100%;'
    + '  position: relative;'
    + '  overflow: hidden;'
    + '  box-sizing: border-box;'
    + '  padding: calc(' + cfg.additional_card_spacing + ' + 16px) 16px calc(' + cfg.additional_card_spacing + ' + 16px) 8px;'
    + '  background: ' + cfg.background_color + ';'
    + '  cursor: pointer;'
    + '}'

    + 'ha-card:focus { outline: none; }'

    + '.content-container {'
    + '  width: 100%;'
    + '  overflow-x: hidden;'
    + '  overflow-y: auto;'
    + '  -webkit-overflow-scrolling: touch;'
    + '  scrollbar-width: none;'
    + '  -ms-overflow-style: none;'
    + '}'
    + '.content-container::-webkit-scrollbar { display: none; }'

    + '.card-header {'
    + '  float: left;'
    + '  margin: 0 0 16px 8px;'
    + '  padding: 0;'
    + '  color: var(--primary-text-color);'
    + '  font-size: var(--paper-font-headline_-_font-size, 24px);'
    + '  font-weight: var(--paper-font-headline_-_font-weight, 400);'
    + '  line-height: var(--paper-font-headline_-_line-height, 32px);'
    + '  -webkit-font-smoothing: antialiased;'
    + '}'

    /* DAY TABLE */
    + 'table {'
    + '  width: 100%;'
    + '  table-layout: fixed;'
    + '  border-spacing: 0;'
    + '  border-collapse: separate;'
    + '  margin-bottom: ' + cfg.day_spacing + ';'
    + '  border: none;'
    + '}'
    + 'table:last-of-type { margin-bottom: 0; }'

    /* DATE COLUMN */
    + '.date-column {'
    + '  width: ' + dateColWidth + ';'
    + '  min-width: ' + dateColWidth + ';'
    + '  max-width: ' + dateColWidth + ';'
    + '  vertical-align: ' + cfg.date_vertical_alignment + ';'
    + '  text-align: center;'
    + '  padding-left: 8px;'
    + '  padding-right: 12px;'
    + '}'

    + '.date-content {'
    + '  display: -webkit-flex; display: flex;'
    + '  -webkit-flex-direction: column; flex-direction: column;'
    + '}'

    + '.weekday {'
    + '  font-size: ' + cfg.weekday_font_size + ';'
    + '  line-height: ' + cfg.weekday_font_size + ';'
    + '  color: ' + cfg.weekday_color + ';'
    + '}'

    + '.day-num {'
    + '  font-size: ' + cfg.day_font_size + ';'
    + '  line-height: ' + cfg.day_font_size + ';'
    + '  font-weight: 500;'
    + '  color: ' + cfg.day_color + ';'
    + '}'

    + '.month {'
    + '  font-size: ' + cfg.month_font_size + ';'
    + '  line-height: ' + cfg.month_font_size + ';'
    + '  text-transform: uppercase;'
    + '  color: ' + cfg.month_color + ';'
    + '}'

    /* EVENTS */
    + '.event {'
    + '  padding: ' + cfg.event_spacing + ' 0 ' + cfg.event_spacing + ' 12px;'
    + '  border-radius: 0;'
    + '}'
    + '.event-first.event-last {'
    + '  border-radius: 0 ' + borderRadius + ' ' + borderRadius + ' 0;'
    + '}'
    + '.event-first {'
    + '  border-radius: 0 ' + borderRadius + ' 0 0;'
    + '}'
    + '.event-last {'
    + '  border-radius: 0 0 ' + borderRadius + ' 0;'
    + '}'

    + '.event-content {'
    + '  display: -webkit-flex; display: flex;'
    + '  -webkit-flex-direction: column; flex-direction: column;'
    + '}'

    + '.event-title {'
    + '  font-size: ' + cfg.event_font_size + ';'
    + '  font-weight: 500;'
    + '  line-height: 1.2;'
    + '  color: ' + cfg.event_color + ';'
    + '  margin-right: 12px;'
    + '  padding-bottom: 2px;'
    + '  overflow: hidden;'
    + '  text-overflow: ellipsis;'
    + '}'

    + '.time-location {'
    + '  display: -webkit-flex; display: flex;'
    + '  -webkit-flex-direction: column; flex-direction: column;'
    + '}'

    + '.time, .location {'
    + '  display: -webkit-flex; display: flex;'
    + '  -webkit-align-items: center; align-items: center;'
    + '  line-height: 1.2;'
    + '  margin-top: 2px;'
    + '  margin-right: 12px;'
    + '}'

    + '.time span, .location span {'
    + '  display: inline-block;'
    + '  vertical-align: middle;'
    + '}'

    + '.time {'
    + '  font-size: ' + cfg.time_font_size + ';'
    + '  color: ' + cfg.time_color + ';'
    + '}'
    + '.time ha-icon {'
    + '  --mdc-icon-size: ' + cfg.time_icon_size + ';'
    + '  margin-right: 4px;'
    + '  -webkit-flex-shrink: 0; flex-shrink: 0;'
    + '}'

    + '.location {'
    + '  font-size: ' + cfg.location_font_size + ';'
    + '  color: ' + cfg.location_color + ';'
    + '}'
    + '.location ha-icon {'
    + '  --mdc-icon-size: ' + cfg.location_icon_size + ';'
    + '  margin-right: 4px;'
    + '  -webkit-flex-shrink: 0; flex-shrink: 0;'
    + '}'

    /* EMPTY DAY */
    + '.empty-event {'
    + '  opacity: 0.6;'
    + '}'
    + '.empty-event .event-title {'
    + '  font-weight: normal;'
    + '  font-style: italic;'
    + '}'

    /* PAST EVENT */
    + '.past-event .event-content {'
    + '  opacity: 0.6;'
    + '}'
  ;
}

/* ================================================
   3. HELPERS
   ================================================ */

/** Normalise entity config to array of {entity, color, label} */
function normaliseEntities(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.reduce(function (acc, e) {
    if (typeof e === 'string' && e) {
      acc.push({ entity: e, color: null, label: null });
    } else if (e && typeof e === 'object' && typeof e.entity === 'string' && e.entity) {
      acc.push({ entity: e.entity, color: e.color || null, label: e.label || null });
    } else {
      console.warn('Calendar Card Pro: invalid entity entry skipped:', e);
    }
    return acc;
  }, []);
}

/** Get start-of-day Date for today (local) */
function todayStart() {
  var d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Add n days to a Date (returns new Date) */
function addDays(date, n) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** Format a date key as YYYY-MM-DD */
function dateKey(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

/** Parse YYYY-MM-DD safely without timezone shift */
function parseDate(str) {
  var parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

/** Check if an event is all-day (start has date but no dateTime) */
function isAllDay(ev) {
  return !!(ev && ev.start && ev.start.date && !ev.start.dateTime);
}

/** Get event start as Date, or null if malformed */
function eventStart(ev) {
  if (!ev || !ev.start) return null;
  if (ev.start.dateTime) {
    var d = new Date(ev.start.dateTime);
    if (isNaN(d.getTime())) { console.warn('Calendar Card Pro: unparseable dateTime', ev); return null; }
    return d;
  }
  if (ev.start.date) return parseDate(ev.start.date);
  return null;
}

/** Get event end as Date, or null if malformed */
function eventEnd(ev) {
  if (!ev || !ev.end) return null;
  if (ev.end.dateTime) {
    var d = new Date(ev.end.dateTime);
    if (isNaN(d.getTime())) { console.warn('Calendar Card Pro: unparseable dateTime', ev); return null; }
    return d;
  }
  if (ev.end.date) {
    /* iCal: all-day end date is exclusive, subtract 1 day */
    var d = parseDate(ev.end.date);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return null;
}

/** Format time using Intl (Safari 12 native) */
function formatTime(date, use24h) {
  if (!date || isNaN(date.getTime())) return '';
  var opts = { hour: 'numeric', minute: '2-digit' };
  if (use24h === true) {
    opts.hour12 = false;
  } else if (use24h === false) {
    opts.hour12 = true;
  }
  /* use24h === 'system' => omit hour12, let browser decide */
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date);
  } catch (e) {
    var h = date.getHours();
    var min = date.getMinutes();
    return h + ':' + (min < 10 ? '0' : '') + min;
  }
}

/** Short weekday name */
function weekdayShort(date) {
  if (!date || isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  } catch (e) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  }
}

/** Short month name */
function monthShort(date) {
  if (!date || isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
  } catch (e) {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()];
  }
}

/** Return display text for an event's time slot (pure — no DOM side-effects) */
function renderEventTimeText(ev, cfg, use24h, isContinuation) {
  if (isAllDay(ev)) return 'All day';
  if (isContinuation) return 'Continues';
  var start = eventStart(ev);
  if (!start) return '';
  var text = formatTime(start, use24h);
  if (cfg.show_end_time) {
    var end = eventEnd(ev);
    if (end) text = text + ' – ' + formatTime(end, use24h);
  }
  return text;
}

/* ================================================
   4. DATA FETCHING
   ================================================ */

function fetchCalendarEvents(hass, entities, start, end) {
  var startISO = start.toISOString();
  var endISO = end.toISOString();
  var fetched = {};
  var promises = [];

  entities.forEach(function (ec) {
    if (fetched[ec.entity]) return;
    fetched[ec.entity] = true;

    var path = 'calendars/' + ec.entity + '?start=' + startISO + '&end=' + endISO;
    var p = hass.callApi('GET', path).then(function (events) {
      if (!events || !Array.isArray(events)) return { events: [], failed: false };
      return {
        events: events.map(function (ev) {
          ev._entityConfig = ec;
          return ev;
        }),
        failed: false
      };
    }).catch(function (err) {
      console.error('Calendar Card Pro: fetch failed for ' + ec.entity + ':', err);
      return { events: [], failed: true, entity: ec.entity };
    });
    promises.push(p);
  });

  return Promise.all(promises).then(function (results) {
    var all = [];
    var failedEntities = [];
    results.forEach(function (r) {
      if (r.failed) {
        failedEntities.push(r.entity);
      } else {
        all = all.concat(r.events);
      }
    });
    return { events: all, failedEntities: failedEntities };
  });
}

/* ================================================
   5. EVENT GROUPING
   ================================================ */

function groupEventsByDay(events, cfg) {
  var start = todayStart();
  var daysCount = cfg._currentDays;
  var now = new Date();

  /* Build day buckets */
  var buckets = {};
  var orderedKeys = [];
  for (var i = 0; i < daysCount; i++) {
    var d = addDays(start, i);
    var key = dateKey(d);
    buckets[key] = { date: d, events: [] };
    orderedKeys.push(key);
  }

  /* HA may return placeholder events with no start — drop them to avoid phantom entries */
  events = events.filter(function (ev) {
    return eventStart(ev) !== null;
  });

  /* Place events into buckets */
  events.forEach(function (ev) {
    var evStart = eventStart(ev);
    var evEndDate = eventEnd(ev) || evStart;

    /* Add event to each day it spans (all-day and multi-day timed events) */
    var dayIter = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate());
    var endDay = new Date(evEndDate.getFullYear(), evEndDate.getMonth(), evEndDate.getDate());

    while (dayIter <= endDay) {
      var k = dateKey(dayIter);
      if (buckets[k]) {
        buckets[k].events.push(ev);
      }
      dayIter = addDays(dayIter, 1);
    }
  });

  /* Filter past events if needed */
  if (!cfg.show_past_events) {
    orderedKeys.forEach(function (key) {
      var bucket = buckets[key];
      var dayDate = bucket.date;
      var isToday = dateKey(dayDate) === dateKey(now);

      if (!isToday) return; /* Future days keep all events; past days already excluded by range */

      bucket.events = bucket.events.filter(function (ev) {
        if (isAllDay(ev)) return true;
        var end = eventEnd(ev);
        if (!end) return true;
        return end > now;
      });
    });
  }

  /* Sort events within each bucket: all-day first, then by start time */
  orderedKeys.forEach(function (key) {
    buckets[key].events.sort(function (a, b) {
      var aAllDay = isAllDay(a) ? 0 : 1;
      var bAllDay = isAllDay(b) ? 0 : 1;
      if (aAllDay !== bAllDay) return aAllDay - bAllDay;
      return eventStart(a) - eventStart(b);
    });
  });

  /* Build result, optionally filtering empty days */
  var result = [];
  orderedKeys.forEach(function (key) {
    var bucket = buckets[key];
    if (!cfg.show_empty_days && bucket.events.length === 0) return;
    result.push(bucket);
  });

  return result;
}

/* ================================================
   6. DOM RENDERING
   ================================================ */

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function renderCard(days, cfg) {
  var frag = document.createDocumentFragment();
  var now = new Date();
  var todayKey = dateKey(now);
  var use24h = cfg.time_24h === true || cfg.time_24h === '24';
  if (cfg.time_24h === 'system' || cfg.time_24h === undefined) {
    use24h = 'system';
  } else if (cfg.time_24h === false || cfg.time_24h === '12') {
    use24h = false;
  }

  days.forEach(function (bucket) {
    var dayDate = bucket.date;
    var events = bucket.events;
    var key = dateKey(dayDate);
    var isToday = key === todayKey;

    var table = el('table', 'day-table');
    var tbody = document.createElement('tbody');

    if (events.length === 0) {
      /* Empty day */
      var tr = document.createElement('tr');

      var dateTd = el('td', 'date-column');
      dateTd.setAttribute('rowspan', '1');
      dateTd.appendChild(buildDateContent(dayDate, cfg, isToday));
      tr.appendChild(dateTd);

      var evtTd = el('td', 'event empty-event event-first event-last');
      evtTd.style.borderLeft = cfg.vertical_line_width + ' solid ' + cfg.accent_color;
      var content = el('div', 'event-content');
      var title = el('div', 'event-title');
      title.textContent = 'No upcoming events';
      content.appendChild(title);
      evtTd.appendChild(content);
      tr.appendChild(evtTd);
      tbody.appendChild(tr);
    } else {
      events.forEach(function (ev, idx) {
        var tr = document.createElement('tr');
        var evCount = events.length;

        /* Date column: only on first event */
        if (idx === 0) {
          var dateTd = el('td', 'date-column');
          dateTd.setAttribute('rowspan', String(evCount));
          dateTd.appendChild(buildDateContent(dayDate, cfg, isToday));
          tr.appendChild(dateTd);
        }

        /* Position classes */
        var posClass = 'event';
        if (evCount === 1) {
          posClass += ' event-first event-last';
        } else if (idx === 0) {
          posClass += ' event-first';
        } else if (idx === evCount - 1) {
          posClass += ' event-last';
        } else {
          posClass += ' event-middle';
        }

        /* Past event check */
        var isPast = false;
        if (isToday && !isAllDay(ev)) {
          var end = eventEnd(ev);
          if (end && end < now) isPast = true;
        }
        if (isPast) posClass += ' past-event';

        var evtTd = el('td', posClass);
        var accentColor = (ev._entityConfig && ev._entityConfig.color) || cfg.accent_color;
        evtTd.style.borderLeft = cfg.vertical_line_width + ' solid ' + accentColor;

        var content = el('div', 'event-content');

        /* Title */
        var titleEl = el('div', 'event-title');
        /* Label prefix */
        if (ev._entityConfig && ev._entityConfig.label) {
          var labelSpan = document.createElement('span');
          labelSpan.textContent = ev._entityConfig.label + ' ';
          labelSpan.style.marginRight = '4px';
          titleEl.appendChild(labelSpan);
        }
        var summarySpan = document.createElement('span');
        summarySpan.textContent = ev.summary || '';
        titleEl.appendChild(summarySpan);
        content.appendChild(titleEl);

        /* Time + Location container */
        var tlContainer = el('div', 'time-location');

        /* Time */
        if (cfg.show_time || isAllDay(ev)) {
          var evStart = eventStart(ev);
          var isContinuation = !isAllDay(ev) && !!evStart && dateKey(evStart) !== key;
          var timeText = renderEventTimeText(ev, cfg, use24h, isContinuation);
          if (timeText) {
            var timeDiv = el('div', 'time');
            var icon = document.createElement('ha-icon');
            icon.setAttribute('icon', 'mdi:clock-outline');
            timeDiv.appendChild(icon);
            var timeSpan = document.createElement('span');
            timeSpan.textContent = timeText;
            timeDiv.appendChild(timeSpan);
            tlContainer.appendChild(timeDiv);
          }
        }

        /* Location */
        if (cfg.show_location && ev.location) {
          var locDiv = el('div', 'location');
          var locIcon = document.createElement('ha-icon');
          locIcon.setAttribute('icon', 'mdi:map-marker');
          locDiv.appendChild(locIcon);
          var locSpan = document.createElement('span');
          locSpan.textContent = ev.location;
          locDiv.appendChild(locSpan);
          tlContainer.appendChild(locDiv);
        }

        content.appendChild(tlContainer);
        evtTd.appendChild(content);
        tr.appendChild(evtTd);
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    frag.appendChild(table);
  });

  return frag;
}

function buildDateContent(date, cfg, isToday) {
  var wrap = el('div', 'date-content');

  var wd = el('div', 'weekday');
  wd.textContent = weekdayShort(date);
  wrap.appendChild(wd);

  var dn = el('div', 'day-num');
  dn.textContent = String(date.getDate());
  wrap.appendChild(dn);

  if (cfg.show_month) {
    var mo = el('div', 'month');
    mo.textContent = monthShort(date);
    wrap.appendChild(mo);
  }

  return wrap;
}

function renderMessage(container, text) {
  if (!container) return;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  var msg = document.createElement('div');
  msg.style.cssText = 'padding:16px 8px;color:var(--secondary-text-color);font-size:14px;';
  msg.textContent = text;
  container.appendChild(msg);
}

/* ================================================
   7. COMPONENT (ES2015 class — required by Custom Elements v1 in Safari 12)
   ================================================ */

class CalendarCardPro extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._events = null;
    this._isExpanded = false;
    this._refreshTimer = null;
    this._visHandler = null;
    this._container = null;
    this._card = null;
    this._styleEl = null;
    this._shellReady = false;
    this._initialized = false;
    this._fetchPending = false;
  }

  connectedCallback() {
    if (!this._initialized) {
      this.attachShadow({ mode: 'open' });
      this._initialized = true;
    }
    this._setupShell();
    this._startRefreshTimer();
    this._fetchAndRender();

    var self = this;
    this._visHandler = function () {
      if (!document.hidden && self._hass) {
        self._fetchAndRender();
      }
    };
    document.addEventListener('visibilitychange', this._visHandler);
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    if (this._visHandler) {
      document.removeEventListener('visibilitychange', this._visHandler);
    }
  }

  _setupShell() {
    if (this._shellReady) return;
    this._shellReady = true;

    var cfg = this._config || {};

    var style = document.createElement('style');
    style.textContent = buildStyles(cfg);
    this.shadowRoot.appendChild(style);

    var card = document.createElement('ha-card');
    card.setAttribute('tabindex', '0');

    /* Title */
    if (cfg.title) {
      var h1 = document.createElement('h1');
      h1.className = 'card-header';
      h1.textContent = cfg.title;
      card.appendChild(h1);
    }

    var container = el('div', 'content-container');
    card.appendChild(container);
    this.shadowRoot.appendChild(card);

    this._container = container;
    this._card = card;
    this._styleEl = style;

    /* Tap handler for expand/collapse */
    var self = this;
    this._isExpanded = false;
    var touchFired = false;
    var touchTimer = 0;

    card.addEventListener('touchend', function (e) {
      touchFired = true;
      e.preventDefault();
      self._toggleExpand();
      /* Reset flag after click-synthesis window so mouse clicks work again on hybrid devices */
      clearTimeout(touchTimer);
      touchTimer = setTimeout(function () { touchFired = false; }, 300);
    });

    card.addEventListener('click', function () {
      if (touchFired) {
        touchFired = false;
        return;
      }
      self._toggleExpand();
    });
  }

  _toggleExpand() {
    this._isExpanded = !this._isExpanded;
    var cfg = this._config;
    cfg._currentDays = this._isExpanded ? cfg.days_to_show : cfg.compact_days_to_show;
    this._render();
  }

  _startRefreshTimer() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    var interval = ((this._config && this._config.refresh_interval) || 30) * 60 * 1000;
    var self = this;
    this._refreshTimer = setInterval(function () {
      self._fetchAndRender();
    }, interval);
  }

  _fetchAndRender() {
    if (!this._hass || !this._config) return;
    if (!this._events) this._renderMessage('Loading…');
    this._fetchPending = true;
    var cfg = this._config;
    var start = todayStart();
    var end = addDays(start, cfg.days_to_show);
    end.setHours(23, 59, 59, 999);

    var self = this;
    fetchCalendarEvents(this._hass, cfg._entities, start, end).then(function (result) {
      self._fetchPending = false;
      self._events = result.events;
      if (result.failedEntities.length > 0 && result.events.length === 0) {
        self._renderMessage('Calendar data unavailable');
      } else {
        self._render();
      }
    }).catch(function (err) {
      self._fetchPending = false;
      console.error('Calendar Card Pro: fetch failed:', err);
      self._renderMessage('Calendar data unavailable');
    });
  }

  _render() {
    if (!this._container || !this._events || !this._config) return;
    var cfg = this._config;
    var days = groupEventsByDay(this._events, cfg);

    /* Clear container */
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    this._container.appendChild(renderCard(days, cfg));
  }

  _renderMessage(text) {
    renderMessage(this._container, text);
  }

  /* --- HA lifecycle --- */

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities) || !config.entities.length) {
      throw new Error('Calendar Card Pro: "entities" must be a non-empty array');
    }

    var cfg = {};
    var key;
    for (key in DEFAULTS) {
      if (DEFAULTS.hasOwnProperty(key)) {
        cfg[key] = DEFAULTS[key];
      }
    }
    for (key in config) {
      if (config.hasOwnProperty(key)) {
        cfg[key] = config[key];
      }
    }

    cfg._entities = normaliseEntities(cfg.entities);
    if (!cfg._entities.length) {
      throw new Error('Calendar Card Pro: no valid entity entries — check your config');
    }
    /* _isExpanded preserved across config reloads; _currentDays reflects current expand state */
    cfg._currentDays = this._isExpanded ? cfg.days_to_show : cfg.compact_days_to_show;

    this._config = cfg;

    /* If already in DOM, rebuild styles, reset timer, and re-render */
    if (this._shellReady && this._styleEl) {
      this._styleEl.textContent = buildStyles(cfg);
      this._startRefreshTimer();
      this._fetchAndRender();
    }
  }

  set hass(value) {
    var needsFetch = !this._hass || (this._events === null && !this._fetchPending);
    this._hass = value;
    if (needsFetch && this._config) {
      this._fetchAndRender();
    }
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    var cfg = this._config;
    if (!cfg) return 3;
    return Math.max(1, (cfg._currentDays || cfg.compact_days_to_show) + 1);
  }

  static getStubConfig() {
    return {
      type: 'custom:calendar-card-pro',
      entities: ['calendar.default']
    };
  }
}

/* ================================================
   8. REGISTRATION
   ================================================ */

customElements.define('calendar-card-pro', CalendarCardPro);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'calendar-card-pro',
  name: 'Calendar Card Pro',
  preview: false,
  description: 'Lightweight calendar card for iOS 12+'
});

console.info(
  '%c CALENDAR-CARD-PRO (lite) %c loaded ',
  'color: white; background: #03a9f4; font-weight: bold;',
  ''
);

/* CJS exports for unit tests — not evaluated in browser (no module global) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normaliseEntities: normaliseEntities,
    eventStart: eventStart,
    eventEnd: eventEnd,
    formatTime: formatTime,
    renderEventTimeText: renderEventTimeText,
    renderMessage: renderMessage
  };
}
