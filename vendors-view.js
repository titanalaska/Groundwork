// Who carries a species -- the lines under it in the Subs panel (index.html)
// and on status.html. One formatter so the two pages cannot word it
// differently. Reads VENDORS from vendors.js, which tools/build_vendors.py
// generates from the species alias table.
//
// ASCII only, with \u escapes: status.html declares no charset, so opened from
// a file a literal middle dot or dash in this script reads back as mojibake --
// the same thing live.js and index.html have both hit.
//
// Record only. Never ranks, recommends or totals -- it says what each list
// says, dated, and the buying call stays with Matt.

function vendorPrice(p){
  if (p === null || p === undefined) return "";
  var s = (p % 1 === 0) ? String(p) : p.toFixed(2);
  return " $" + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// One line per product, in the order VENDORS.lists gives. A vendor that is
// null was read and does not carry it; a vendor that is absent was never read
// for this species and gets no line -- "not on list" is only ever said about a
// list somebody actually checked.
//
// Returns null when vendors.js did not load, so each page decides how to say so.
function vendorLines(slug, planName){
  if (typeof VENDORS === "undefined" || !VENDORS || !VENDORS.species) return null;
  var sp = VENDORS.species[slug];
  if (!sp || !sp.mapped) {
    return ["Not mapped yet \u2014 no vendor list has been matched to this species."];
  }
  var out = [];
  var plan = String(planName).toLowerCase();
  Object.keys(VENDORS.lists).forEach(function(v){
    if (!Object.prototype.hasOwnProperty.call(sp.offers, v)) return;
    var list = VENDORS.lists[v], products = sp.offers[v];
    if (products === null) { out.push(list.label + ": not on list (" + list.dated + ")"); return; }
    products.forEach(function(o){
      var named = (o.as && o.as.toLowerCase() !== plan) ? ' as "' + o.as + '"' : "";
      out.push(list.label + named + ": " +
        o.forms.map(function(f){ return f[0] + vendorPrice(f[1]); }).join(" \u00b7 ") +
        " (" + list.dated + ")");
    });
  });
  return out.length ? out : ["No vendor list has been read for this species yet."];
}
