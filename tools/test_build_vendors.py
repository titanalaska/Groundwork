# Tests for build_vendors.py. Fixtures only -- the real catalogs live outside
# this public repo. Expected values are read off the fixture lines, which are
# copied in shape from the real books (McKay xlsx rows, Martin's prose list,
# Bron's tab-separated rows).
import unittest
from build_vendors import BuildError, build, render_js, slug, groundwork_species

LISTS = {
    "seedntree": {"label": "Seed 'n' Tree", "dated": "2026 list, rec'd 7/1/26"},
    "mckay": {"label": "McKay", "dated": "list of 7/20/26"},
    "bron": {"label": "Bron & Sons", "dated": "2027 booking form"},
}
CATALOGS = {
    # Martin prints the name on one line and the prices on the next.
    "seedntree": ["Alaska paper birch… Clumps add 10%",
                  "1.5”   $175             1.75”   $198",
                  "2”  $238           2.25”     $278"],
    # McKay files paper birch as CANOE birch.
    "mckay": ["Birch Canoe Single\t2\" B&B\t189.00"],
    # Bron's tab-separated rows carry three decimals.
    "bron": ["POTFPBEA\tPotentilla frut. 'P.B.'\tPink Beauty Potentilla\t#5\t23.786000000000001"],
}


def row(**kw):
    base = {"plan_name": "Paper Birch", "status": "verified", "offers": {}}
    base.update(kw)
    return base


class BuildTests(unittest.TestCase):
    def test_slug_matches_the_app(self):
        # index.html slug(): decode, lower, non-alnum runs to "-", trim.
        self.assertEqual(slug("Bishop&#39;s Weed (Goutweed)"), "bishop-s-weed-goutweed")
        self.assertEqual(slug("Hardy Purple Common Lilac (#2 sub)"), "hardy-purple-common-lilac-2-sub")

    def test_groundwork_species_reads_jobs_js(self):
        js = 'items: [\n ["Paper Birch", 24],\n ["Bishop&#39;s Weed (Goutweed)", 305],\n ["Late Lilac", 44, true]]'
        self.assertEqual(groundwork_species(js),
                         ["Bishop's Weed (Goutweed)", "Late Lilac", "Paper Birch"])

    def test_same_plant_under_the_vendors_own_name(self):
        alias = [row(offers={"mckay": {"as": "Birch Canoe Single",
                                       "forms": [{"size": "2\" B&B", "price": 189.00}]}})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["paper-birch"]["offers"]["mckay"],
                         {"as": "Birch Canoe Single", "forms": [["2\" B&B", 189.0]]})

    def test_plan_name_search_is_the_trap(self):
        # Searching McKay for "Paper Birch" finds nothing -- that is why "as" exists.
        alias = [row(offers={"mckay": {"as": "Paper Birch", "forms": [{"size": "2\"", "price": 189}]}})]
        with self.assertRaisesRegex(BuildError, "not found"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_a_price_not_printed_near_the_name_is_refused(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch",
                                           "forms": [{"size": "2\"", "price": 283}]}})]
        with self.assertRaisesRegex(BuildError, "283"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_prices_on_the_line_after_the_name_are_found(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch",
                                           "forms": [{"size": "2\"", "price": 238}]}})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["paper-birch"]["offers"]["seedntree"]["forms"], [["2\"", 238]])

    def test_three_decimal_catalog_price_matches_cents(self):
        alias = [row(plan_name="Pink Beauty Potentilla", offers={"bron": {
            "as": "Pink Beauty Potentilla", "forms": [{"size": "#5", "price": 23.79}]}})]
        data, _ = build(alias, ["Pink Beauty Potentilla"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["pink-beauty-potentilla"]["offers"]["bron"]["forms"], [["#5", 23.79]])

    def test_not_on_list_is_kept_as_null(self):
        alias = [row(offers={"bron": None})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertIsNone(data["species"]["paper-birch"]["offers"]["bron"])

    def test_a_note_cannot_ride_along(self):
        alias = [row(offers={"mckay": {"as": "Birch Canoe Single",
                                       "forms": [{"size": "2\" B&B", "price": 189, "note": "Chris's figure"}]}})]
        with self.assertRaisesRegex(BuildError, "note"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_unknown_offer_key_refused(self):
        alias = [row(offers={"mckay": {"as": "Birch Canoe Single", "forms": [], "why": "x"}})]
        with self.assertRaisesRegex(BuildError, "why"):
            build(alias, ["Paper Birch"], LISTS, CATALOGS)

    def test_species_missing_from_the_table_is_unmapped(self):
        data, _ = build([], ["Early Forsythia"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["early-forsythia"], {"mapped": False})

    def test_unresolved_row_is_unmapped(self):
        alias = [row(status="unresolved", offers={"bron": None})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["paper-birch"], {"mapped": False})

    def test_also_plan_names_share_a_row(self):
        alias = [row(plan_name="Hardy Purple Common Lilac",
                     also_plan_names=["Hardy Purple Common Lilac (#2 sub)"], offers={"bron": None})]
        data, _ = build(alias, ["Hardy Purple Common Lilac", "Hardy Purple Common Lilac (#2 sub)"], LISTS, CATALOGS)
        self.assertTrue(data["species"]["hardy-purple-common-lilac-2-sub"]["mapped"])

    def test_vendor_not_in_lists_is_skipped_out_loud(self):
        alias = [row(offers={"kalco": {"as": "Paper Birch", "forms": []}, "bron": None})]
        data, warnings = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertNotIn("kalco", data["species"]["paper-birch"]["offers"])
        self.assertTrue(any("kalco" in w for w in warnings))

    def test_only_groundwork_species_are_output(self):
        alias = [row(plan_name="Sienna Glen Maple", offers={"bron": None})]
        data, _ = build(alias, ["Paper Birch"], LISTS, CATALOGS)
        self.assertEqual(list(data["species"]), ["paper-birch"])

    def test_output_is_ascii(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch’s", "forms": []}})]
        cat = dict(CATALOGS, seedntree=["Alaska paper birch’s"])
        data, _ = build(alias, ["Paper Birch"], LISTS, cat)
        self.assertTrue(render_js(data).isascii())


if __name__ == "__main__":
    unittest.main()
