"""
Fun facts prepared for future database seeding.
These facts match the mobile constants/funFacts.ts content.

NOT a runnable seed — no database calls, no schema changes.
To seed into the database later, import COUNTRY_FACTS and insert
records into whichever table you create for facts (e.g. country_fact).

Each entry: {"country_code": str, "facts": list[str]}
All facts are under 120 characters and cover culture, education,
geography, food, and history only — no visa or immigration claims.
"""

COUNTRY_FACTS: list[dict] = [
    {
        "country_code": "US",
        "facts": [
            "The US has over 4,000 universities — more than any other country in the world.",
            "Over 1 million international students study in the US each year.",
            "The US National Park system protects over 85 million acres across 63 parks.",
            "American English has absorbed words from over 150 languages.",
            "The US spans 6 time zones and an extraordinary range of climates.",
            "The Library of Congress holds over 170 million items — the world's largest library.",
            "Silicon Valley accounts for roughly one-third of all US venture capital investment.",
            "The Smithsonian Institution runs 19 museums in Washington DC — all free to the public.",
        ],
    },
    {
        "country_code": "UK",
        "facts": [
            "Oxford University has been continuously teaching students since around 1096 — nearly 1,000 years old.",
            "The British Library holds over 170 million items, one of the largest collections in the world.",
            "The UK has produced more Nobel Prize winners per capita than almost any other country.",
            "Britain has more castles per square mile than almost any other country — over 6,000 in total.",
            "The London Underground opened in 1863 — the world's first underground railway system.",
            "The World Wide Web was invented by British scientist Tim Berners-Lee in 1989.",
            "Greenwich, London is the home of Coordinated Universal Time (UTC+0) — the world's clock reference.",
        ],
    },
    {
        "country_code": "CA",
        "facts": [
            "Canada has more lakes than the rest of the world combined — over 2 million.",
            "Canada is the second largest country by area, yet most of its population lives within 100 km of the US border.",
            "Canadian universities like Toronto and UBC consistently rank among the world's top 50.",
            "Canada has two official languages — English and French.",
            "Toronto and Vancouver are consistently ranked among the world's most liveable cities.",
            "Canada invented basketball — James Naismith, a Canadian, created the game in 1891.",
            "Canada has the longest coastline in the world, stretching over 202,000 km.",
        ],
    },
    {
        "country_code": "AU",
        "facts": [
            "Australia is the only country that is also an entire continent.",
            "8 of the world's top 100 universities are in Australia.",
            "The Great Barrier Reef is the world's largest living structure, visible from space.",
            "Australia is home to more venomous animal species than any other country — but encounters are rare.",
            "Australians invented WiFi, the cochlear implant, and the black box flight recorder.",
            "Australia has been a continuous democracy since 1901 — one of the oldest in the world.",
            "Australians consume more ice cream per capita than almost any other country on the planet.",
        ],
    },
    {
        "country_code": "DE",
        "facts": [
            "Most German public universities charge no tuition fees — even for international students.",
            "Germany has over 400 universities and more than 19,000 degree programs to choose from.",
            "Germany produces more than 1,500 different types of bread — a recognised cultural institution.",
            "Germany is the largest economy in Europe and one of the top exporters globally.",
            'The German language gave English words like "kindergarten", "rucksack", and "hamburger".',
            "Berlin's Museum Island is a UNESCO World Heritage Site and home to 5 world-class museums.",
            "Germany has the world's most extensive motorway (Autobahn) network without a general speed limit.",
        ],
    },
    {
        "country_code": "FR",
        "facts": [
            "France is consistently the world's most visited country, with over 89 million tourists per year.",
            "French is spoken on 5 continents by over 275 million people worldwide.",
            "The Louvre in Paris is the world's most visited museum, with over 9 million visitors per year.",
            "The French grandes écoles system includes some of the most selective universities on Earth.",
            "France has won more Nobel Prizes in literature than any other country.",
            "France gave the United States the Statue of Liberty — a gift of friendship in 1886.",
            "France has the highest density of Michelin-starred restaurants in the world.",
        ],
    },
    {
        "country_code": "CN",
        "facts": [
            "China has 57 UNESCO World Heritage Sites — more than any other country in the world.",
            'China invented paper, printing, gunpowder, and the compass — the "Four Great Inventions".',
            "China has the world's largest high-speed rail network, spanning over 45,000 km.",
            "China produces more STEM graduates annually than any other country on the planet.",
            "The Chinese writing system has been in continuous use for over 3,500 years.",
            "The Great Wall stretches over 21,000 km — longer than any other man-made structure.",
            "China is the world's largest producer of rice, wheat, and many other staple crops.",
            "Chinese is the language with the most native speakers in the world — around 920 million.",
        ],
    },
    {
        "country_code": "JP",
        "facts": [
            "Japan has the world's oldest company — Kongō Gumi, a construction firm founded in 578 AD.",
            "Japan's bullet trains have operated since 1964 with an extraordinary safety record.",
            "Japan has over 5 million vending machines — you can buy hot meals, books, and umbrellas.",
            "Japanese convenience stores (konbini) are open 24/7 and serve hot food, banking, and bills.",
            "Japan has over 100 active volcanoes and experiences around 1,500 earthquakes per year.",
            "Japan leads the world in the number of Michelin-starred restaurants per capita.",
            "Japan has the highest number of UNESCO Intangible Cultural Heritage elements in Asia.",
        ],
    },
    {
        "country_code": "NL",
        "facts": [
            "The Netherlands has more bicycles than people — cycling is the primary form of daily transport.",
            "The Dutch are statistically the tallest people in the world on average.",
            "The Netherlands was the first country in the world to legalise same-sex marriage, in 2001.",
            "Amsterdam has more canals than Venice and is built across nearly 200 islands.",
            "The Netherlands produces over 40% of the world's exported cut flowers.",
            "The Dutch reclaimed roughly 17% of their country's land from the sea through engineering.",
            "Dutch master painters — Rembrandt, Vermeer, Van Gogh — gave the world some of its most iconic art.",
        ],
    },
    {
        "country_code": "IE",
        "facts": [
            "Ireland has one of the youngest populations in Europe, with a thriving tech and startup scene.",
            "Dublin is a hub for global tech giants — Google, Meta, and Apple all have European HQs there.",
            "Ireland produces some of the world's most celebrated writers, including Joyce, Beckett, and Wilde.",
            "The Irish language (Gaeilge) is one of Europe's oldest living languages.",
            "Ireland's coastline features over 2,500 km of some of Europe's most dramatic cliff scenery.",
            "St. Patrick's Day is celebrated in more countries than almost any other national holiday.",
            "Irish traditional music is a UNESCO-recognised Intangible Cultural Heritage of Humanity.",
        ],
    },
    {
        "country_code": "NZ",
        "facts": [
            "New Zealand was the first country in the world to grant women the right to vote, in 1893.",
            "New Zealand has more species of bird per square kilometre than almost any other country.",
            "The country is so geologically young that it still has active volcanoes and geysers.",
            "New Zealand has some of the cleanest air and water quality measurements in the world.",
            "The Maori language (Te Reo) is an official language alongside English.",
            "New Zealand has around 6 sheep for every person — one of the highest ratios in the world.",
            "New Zealand's Fiordland National Park is so remote that many areas remain almost unexplored.",
        ],
    },
    {
        "country_code": "SG",
        "facts": [
            "Singapore is one of only three city-states in the world.",
            "Singapore's Changi Airport has been voted the world's best airport multiple times.",
            "Singapore has four official languages: English, Mandarin, Malay, and Tamil.",
            "Singapore ranks among the top 3 in the world for ease of doing business.",
            "Despite its small size, Singapore has two of the world's top 20 universities.",
            "Singapore's hawker centres serve UNESCO-recognised street food at remarkably accessible prices.",
            "Singapore has over 50% green and vegetation cover — more than most major world cities.",
        ],
    },
    {
        "country_code": "KR",
        "facts": [
            "South Korea has one of the highest internet speeds and smartphone penetration rates in the world.",
            "The country achieved a near-100% literacy rate within just a few decades of the Korean War.",
            "South Korea's K-pop and K-drama industries have become a global cultural phenomenon.",
            "Seoul has more Michelin-starred restaurants than almost any other Asian city.",
            "South Korea invests more in R&D as a percentage of GDP than almost any other country.",
            "Hangeul, the Korean alphabet, was scientifically designed by royal scholars in the 15th century.",
            "South Korea is home to four of the world's top 10 largest shipbuilders by output.",
        ],
    },
    {
        "country_code": "AE",
        "facts": [
            "The UAE built one of the world's tallest structures — the Burj Khalifa stands at 828 metres.",
            "Dubai transformed from a small fishing village into a global city in roughly 60 years.",
            "The UAE has over 200 nationalities living within its borders — among the most diverse on Earth.",
            "Abu Dhabi holds approximately 6% of the world's proven oil reserves.",
            "Falconry has been practised in the UAE for over 4,000 years and is a UNESCO Heritage tradition.",
            "The UAE has no personal income tax — one of the few countries in the world with this policy.",
            "Louvre Abu Dhabi is the first universal museum in the Arab world, opened in 2017.",
        ],
    },
    {
        "country_code": "IT",
        "facts": [
            "Italy has 58 UNESCO World Heritage Sites — more than any other country in the world.",
            "The University of Bologna, founded in 1088 AD, is the world's oldest university.",
            "Over 60% of the world's known art heritage is located in Italy.",
            "Italy is the world's largest wine producer and one of the top global exporters.",
            "Italy gave the world pizza, pasta, gelato, espresso — and the Renaissance.",
            "Rome was the heart of an empire that shaped Western law, language, and architecture.",
            "The Italian language descended directly from Latin and has around 85 million speakers worldwide.",
        ],
    },
    {
        "country_code": "IN",
        "facts": [
            "India has the world's largest student population, with over 38 million enrolled in higher education.",
            "India produces more English-speaking graduates each year than any other country.",
            "The IIT network has produced leaders at Google, Microsoft, and Adobe, among many others.",
            "India has 42 UNESCO World Heritage Sites — from the Taj Mahal to the caves of Ajanta.",
            "India is the world's largest democracy, with over 900 million eligible voters.",
            "India is the birthplace of four major world religions: Hinduism, Buddhism, Jainism, and Sikhism.",
            "The Indian Railway network carries over 23 million passengers per day.",
            "India's film industry produces more feature films each year than Hollywood.",
        ],
    },
]
