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
                         [{"as": "Birch Canoe Single", "forms": [["2\" B&B", 189.0]]}])

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
        self.assertEqual(data["species"]["paper-birch"]["offers"]["seedntree"][0]["forms"], [["2\"", 238]])

    def test_three_decimal_catalog_price_matches_cents(self):
        alias = [row(plan_name="Pink Beauty Potentilla", offers={"bron": {
            "as": "Pink Beauty Potentilla", "forms": [{"size": "#5", "price": 23.79}]}})]
        data, _ = build(alias, ["Pink Beauty Potentilla"], LISTS, CATALOGS)
        self.assertEqual(data["species"]["pink-beauty-potentilla"]["offers"]["bron"][0]["forms"], [["#5", 23.79]])

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

    def test_a_longer_name_in_a_tab_row_is_not_a_match(self):
        # Bron row 1860: "Prairie Dream Paper Birch" is a different cultivar at
        # the same #5 45.197. A substring match would let it vouch for Paper Birch.
        cat = dict(CATALOGS, bron=["BEPAPDRE\tBetula papyrifera 'Varen'\tPrairie Dream Paper Birch\t#5\t45.197"])
        alias = [row(offers={"bron": {"as": "Paper Birch", "forms": [{"size": "#5", "price": 45.20}]}})]
        with self.assertRaisesRegex(BuildError, "not found"):
            build(alias, ["Paper Birch"], LISTS, cat)

    def test_the_size_must_be_on_the_line_with_the_price(self):
        # Bron prints each size on its own row. 83.61 is the #10 price; typed
        # against #5 it must be refused, even though both rows sit together.
        cat = dict(CATALOGS, bron=["BEPAPYRI\tBetula papyrifera\tPaper Birch\t#5\t45.197",
                                   "BEPAPYRI\tBetula papyrifera\tPaper Birch\t#10\t83.605999999999995"])
        ok = [row(offers={"bron": {"as": "Paper Birch", "forms": [{"size": "#10", "price": 83.61}]}})]
        build(ok, ["Paper Birch"], LISTS, cat)
        bad = [row(offers={"bron": {"as": "Paper Birch", "forms": [{"size": "#5", "price": 83.61}]}})]
        with self.assertRaisesRegex(BuildError, "#5"):
            build(bad, ["Paper Birch"], LISTS, cat)

    def test_a_size_with_no_price_must_still_be_printed(self):
        # Stewart has no prices, so the size is the only thing to check.
        cat = dict(CATALOGS, bron=["Betula papyrifera", "Paper Birch", "#15", "2-7"])
        alias = [row(offers={"bron": {"as": "Paper Birch", "forms": [{"size": "#20", "price": None}]}})]
        with self.assertRaisesRegex(BuildError, "#20"):
            build(alias, ["Paper Birch"], LISTS, cat)

    def test_mckay_spaces_its_container_sizes(self):
        # McKay prints "# 3 Container"; the table may say "#3 Container".
        cat = dict(CATALOGS, mckay=["SHRUB\tsrena34030\tSpiraea vanhouttei 'Renaissance'\tRenaissance Bridal Wreath Spirea \t# 3 Container\t\t\t\t17.75\t286"])
        alias = [row(plan_name="Vanhoutte Spirea", offers={"mckay": {
            "as": "Renaissance Bridal Wreath Spirea", "forms": [{"size": "#3 Container", "price": 17.75}]}})]
        data, _ = build(alias, ["Vanhoutte Spirea"], LISTS, cat)
        self.assertEqual(data["species"]["vanhoutte-spirea"]["offers"]["mckay"][0]["forms"], [["#3 Container", 17.75]])

    def test_catalog_lines_reads_only_the_named_sheet(self):
        # McKay's workbook holds a product master (no prices, not availability)
        # beside the availability sheet. Only the named sheet may be read.
        import openpyxl, tempfile, os
        from build_vendors import catalog_lines
        wb = openpyxl.Workbook()
        wb.active.title = "All"
        wb.active.append(["bcans23c6", "Birch Canoe Single (Betula papyrifera)", "2\" B&B"])
        wb.create_sheet("McKay Availability").append(["SHRUB", "srena34030", "Renaissance Bridal Wreath Spirea", "# 3 Container", 17.75])
        path = os.path.join(tempfile.mkdtemp(), "m.xlsx")
        wb.save(path)
        lines = catalog_lines(path, sheet="McKay Availability")
        self.assertEqual(len(lines), 1)
        self.assertIn("Renaissance", lines[0])

    def test_one_vendor_can_sell_the_plant_as_two_products(self):
        # Martin: "Colorado blue and green spruce, Ak. grown" at 4'-5' AND
        # "Colorado green spruce. Idaho, Specimen trees" at 7'-8'. Both stay.
        cat = dict(CATALOGS, seedntree=[
            "Colorado blue and green spruce, Ak. grown. ",
            "4’-5’   $245    5’-6’  $325 ",
            "Colorado green spruce. Idaho, Specimen trees ",
            "7’-8’  $1,128 "])
        alias = [row(plan_name="Colorado Green Spruce", offers={"seedntree": [
            {"as": "Colorado blue and green spruce, Ak. grown", "forms": [{"size": "4'-5'", "price": 245}]},
            {"as": "Colorado green spruce. Idaho, Specimen trees", "forms": [{"size": "7'-8'", "price": 1128}]}]})]
        data, _ = build(alias, ["Colorado Green Spruce"], LISTS, cat)
        got = data["species"]["colorado-green-spruce"]["offers"]["seedntree"]
        self.assertEqual([o["as"] for o in got],
                         ["Colorado blue and green spruce, Ak. grown", "Colorado green spruce. Idaho, Specimen trees"])
        self.assertEqual(got[1]["forms"], [["7'-8'", 1128]])

    def test_output_is_ascii(self):
        alias = [row(offers={"seedntree": {"as": "Alaska paper birch’s", "forms": []}})]
        cat = dict(CATALOGS, seedntree=["Alaska paper birch’s"])
        data, _ = build(alias, ["Paper Birch"], LISTS, cat)
        self.assertTrue(render_js(data).isascii())


if __name__ == "__main__":
    unittest.main()
