# Maps scorecard_id (str) -> OpenAlex institution URL.
# Every entry is verified: name confirmed + state/region cross-checked via API.
# Confidence is always "high" for override matches.
OVERRIDES: dict[str, str] = {
    # ──── Online / immersion / world-campus variants → base institution ─────────────
    "104151": "https://openalex.org/I55732556",    # ASU Campus Immersion → ASU
    "483124": "https://openalex.org/I55732556",    # ASU Digital Immersion → ASU
    "484473": "https://openalex.org/I33213144",    # U Florida-Online → UF
    "479956": "https://openalex.org/I130769515",   # Penn State-World Campus → PSU
    "154022": "https://openalex.org/I138006243",   # U Arizona Global Campus → UA

    # ──── "-Main Campus" / geographic campus qualifier variants ─────────────────────
    "170976": "https://openalex.org/I27837315",    # U Michigan-Ann Arbor → U Michigan
    "214777": "https://openalex.org/I130769515",   # Penn State-Main Campus
    "204796": "https://openalex.org/I52357470",    # Ohio State-Main Campus
    "243780": "https://openalex.org/I219193219",   # Purdue-Main Campus (West Lafayette)
    "234076": "https://openalex.org/I51556381",    # U Virginia-Main Campus
    "186380": "https://openalex.org/I102322142",   # Rutgers-New Brunswick
    "126818": "https://openalex.org/I92446798",    # Colorado State-Fort Collins
    "199193": "https://openalex.org/I137902535",   # NC State at Raleigh
    "183044": "https://openalex.org/I161057412",   # U New Hampshire-Main Campus
    "228723": "https://openalex.org/I91045830",    # Texas A&M-College Station
    "174066": "https://openalex.org/I130238516",   # U Minnesota-Twin Cities
    "178396": "https://openalex.org/I76835614",    # U Missouri-Columbia
    "218663": "https://openalex.org/I155781252",   # U South Carolina-Columbia
    "207500": "https://openalex.org/I8692664",     # U Oklahoma-Norman Campus
    "215293": "https://openalex.org/I170201317",   # U Pittsburgh-Pittsburgh Campus
    "236948": "https://openalex.org/I201448701",   # U Washington-Seattle Campus
    "377555": "https://openalex.org/I4210138624",  # U Washington-Bothell
    "377564": "https://openalex.org/I4210150356",  # U Washington-Tacoma
    "126562": "https://openalex.org/I921990950",   # U Colorado Denver/Anschutz
    "187985": "https://openalex.org/I169521973",   # UNM-Main Campus
    "160755": "https://openalex.org/I114832834",   # Tulane U of Louisiana
    "204024": "https://openalex.org/I83328450",    # Miami U-Oxford
    "200332": "https://openalex.org/I57328836",    # NDSU-Main Campus
    "204857": "https://openalex.org/I4210106879",  # Ohio U-Main Campus
    "207388": "https://openalex.org/I115475287",   # OSU-Main Campus
    "188030": "https://openalex.org/I10052268",    # NMSU-Main Campus
    "200800": "https://openalex.org/I110152177",   # U Akron Main Campus
    "201885": "https://openalex.org/I63135867",    # U Cincinnati-Main Campus
    "179566": "https://openalex.org/I119942284",   # Missouri State-Springfield
    "201441": "https://openalex.org/I157417397",   # BGSU-Main Campus
    "206604": "https://openalex.org/I19648265",    # Wright State-Main Campus
    "174783": "https://openalex.org/I173963315",   # Saint Cloud State
    "139755": "https://openalex.org/I130701444",   # Georgia Tech-Main Campus
    "233921": "https://openalex.org/I859038795",   # Virginia Tech

    # ──── "The University of X" / "The College of X" fixes ─────────────────────────
    "100751": "https://openalex.org/I17301866",    # The U of Alabama (Tuscaloosa — NOT UAB)
    "180489": "https://openalex.org/I6750721",     # The U of Montana
    "221759": "https://openalex.org/I75027704",    # The U of Tennessee-Knoxville
    "221740": "https://openalex.org/I177097968",   # The U of Tennessee-Chattanooga
    "221768": "https://openalex.org/I109963312",   # The U of Tennessee-Martin
    "137847": "https://openalex.org/I93320256",    # The U of Tampa
    "187134": "https://openalex.org/I64281891",    # The College of New Jersey

    # ──── Columbia (name includes "in the City of New York") ────────────────────────
    "190150": "https://openalex.org/I78577930",    # Columbia U in the City of New York

    # ──── CUNY branches ─────────────────────────────────────────────────────────────
    "190512": "https://openalex.org/I141810926",   # CUNY Baruch → Baruch College
    "190549": "https://openalex.org/I83041322",    # CUNY Brooklyn → Brooklyn College
    "190567": "https://openalex.org/I125687163",   # CUNY City College → City College of NY
    "190594": "https://openalex.org/I39694355",    # CUNY Hunter → Hunter College
    "190600": "https://openalex.org/I92507152",    # CUNY John Jay → John Jay CJ
    "190637": "https://openalex.org/I161301626",   # CUNY Lehman → Lehman College
    "190655": "https://openalex.org/I76513827",    # CUNY NYC College of Technology
    "190691": "https://openalex.org/I150397245",   # CUNY York → York College CUNY
    "190558": "https://openalex.org/I142393192",   # College of Staten Island CUNY

    # ──── Ampersand / special-name schools ──────────────────────────────────────────
    "199102": "https://openalex.org/I35777872",    # NC A & T → NC A&T (Agricultural and Technical)
    "160621": "https://openalex.org/I145610796",   # Southern U and A & M College
    "100654": "https://openalex.org/I176692203",   # Alabama A & M → Alabama A&M

    # ──── SUNY schools ──────────────────────────────────────────────────────────────
    "196060": "https://openalex.org/I392282",      # University at Albany (SUNY)
    "196088": "https://openalex.org/I63190737",    # University at Buffalo (SUNY)

    # ──── Hawaii ────────────────────────────────────────────────────────────────────
    "141574": "https://openalex.org/I117965899",   # U Hawaii at Manoa

    # ──── Puerto Rico ────────────────────────────────────────────────────────────────
    "243197": "https://openalex.org/I60388903",    # UPR-Mayaguez

    # ──── Maryville / Tennessee ──────────────────────────────────────────────────────
    "178059": "https://openalex.org/I16989420",    # Maryville U of Saint Louis

    # ──── University of Texas system ("at City" names) ───────────────────────────────
    "228778": "https://openalex.org/I86519309",    # UT Austin
    "228769": "https://openalex.org/I189196454",   # UT Arlington
    "228787": "https://openalex.org/I162577319",   # UT Dallas
    "228796": "https://openalex.org/I164936912",   # UT El Paso
    "229027": "https://openalex.org/I45438204",    # UT San Antonio
    "228802": "https://openalex.org/I221716585",   # UT Tyler

    # ──── University of Louisiana system ("at City" names) ───────────────────────────
    "160658": "https://openalex.org/I79516672",    # U Louisiana at Lafayette
    "159993": "https://openalex.org/I71730758",    # U Louisiana at Monroe

    # ──── Other previously unmatched ─────────────────────────────────────────────────
    "163204": "https://openalex.org/I4210107443",  # U Maryland Global Campus
    "140447": "https://openalex.org/I150149174",   # Mercer University
    "186201": "https://openalex.org/I171851574",   # Ramapo College of New Jersey
    "482158": "https://openalex.org/I931969281",   # Middle Georgia State University
}
