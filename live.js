// Reading the field record, for the pages Chris and Todd open.
//
// status.html and shortage.html both show numbers that live in the app. Until
// 9/21 both carried their own typed copies and both drifted. They read the
// record now, and this is the one copy of how that is done -- because two
// hand-maintained copies of the same fetch logic would be the same mistake in
// a different file.
//
// The record is the sync document the app writes to. It answers a plain GET
// with no key and no Google session; WRITING needs the key in localStorage,
// reading does not. That asymmetry is the only reason these pages can exist.
//
// The app polls this same document -- see sheetDb() in index.html. The rules
// below are deliberately the same ones, for the same reasons.

var SYNC_URL = "https://script.google.com/macros/s/AKfycbwZ_nEbfpR5zdX6Rz7fIi0hKEO63f_xsnl9WPFwW6RJL7Q1rEqBd7nsfDXLqJcqZKu4/exec";
var POLL_MS = 60000;

function fetchRecord(){
  return fetch(SYNC_URL + "?action=get&t=" + Date.now(), {cache: "no-store"})
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (!j || !j.ok) throw new Error((j && j.error) || "the field app returned no record");
      return j;
    });
}

// Load once, then keep an open tab current.
//
// onRecord(j) is called with a record worth painting. onStale() is called when
// refreshing has failed twice in a row AFTER something was already painted.
// onFail(msg) is called when the FIRST load fails.
//
// Those last two are different on purpose, and the distinction is the whole
// point of this file:
//
//   first load fails   nothing true can be shown, so show nothing
//   a refresh fails    what is on screen was real, it is only ageing
//
// Blanking a good record over one dead spot throws away information and
// teaches people the page is flaky. So the figures stay and the page stops
// calling itself live.
function startLive(onRecord, onFail, onStale){
  var lastSeen = "";
  var missed = 0;
  var painted = false;

  function take(j){
    lastSeen = j.updatedAt || lastSeen;
    missed = 0;
    painted = true;
    onRecord(j);
  }

  fetchRecord().then(take).catch(function(e){
    onFail(e && e.message ? e.message : String(e));
  });

  function poll(){
    // This sits in a background tab all day. There is no reason to keep asking
    // on behalf of a screen nobody is looking at.
    if (document.hidden) return;
    fetchRecord().then(function(j){
      missed = 0;
      // Only repaint when the record actually MOVED. Repainting every minute
      // throws away a scroll position and flickers a table that gets read
      // across a room.
      if (!j.updatedAt || j.updatedAt === lastSeen) return;
      take(j);
    }).catch(function(){
      // One miss is a phone in a dead spot, not news. Two is worth saying.
      if (++missed >= 2 && painted && onStale) onStale(lastSeen);
    });
  }

  setInterval(poll, POLL_MS);
  // A tab brought back to the front should not wait out the rest of its minute.
  document.addEventListener("visibilitychange", function(){
    if (!document.hidden) poll();
  });

  // Exposed so a test can drive a poll without waiting 60 seconds of real time.
  startLive.poll = poll;
}

// Shared helpers, so the two pages agree on what a species is called and how a
// count becomes a shortfall.
function decodeEntities(s){
  var el = document.createElement("textarea");
  el.innerHTML = String(s);
  return el.value;
}
function slugOf(name){
  return decodeEntities(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function escapeHtml(s){
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Substitution options, as the app writes them: notes["subs-<job>:<slug>"],
// a JSON string of {sp, qty, note}. They live in notes, not a field of their
// own, because the old Wolf app rewrites the whole record and keeps only what
// it knows -- and it carries notes through whole.
//
// Record only. Nothing here feeds a count, a shortfall or a total.
//
// A garbled entry reads as no subs rather than throwing: this page builds
// every job in one pass, and one bad string off a phone must not blank it for
// Chris. Options with no species picked yet are left off.
//
// Returns plain text lines; callers escape them, because they build HTML.
//
// The multiplication sign and dash are written as escapes on purpose.
// status.html and shortage.html declare no charset, so opened from a file this
// script is read as Windows-1252 and a literal one comes out as mojibake --
// the same thing index.html hit with its minus sign.
function subsFor(notes, key){
  var raw = notes && notes["subs-" + key];
  if (!raw) return [];
  var list;
  try { list = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(list)) return [];
  return list.filter(function(o){ return o && typeof o.sp === "string" && o.sp; }).map(function(o){
    return "sub option: " + o.sp +
      (typeof o.qty === "number" ? " \u00d7 " + o.qty : " (qty open)") +
      (typeof o.note === "string" && o.note ? " \u2014 " + o.note : "");
  });
}

// When the record was taken -- not when somebody last edited a file, which is
// what a typed date meant and why it was always a little wrong.
function countedAt(iso){
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}
