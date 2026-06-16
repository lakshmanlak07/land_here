"""
Tests for the /countries endpoints.
All read-only — no data is written to the test database.
"""


def test_list_all_countries_returns_22(client):
    """The seeded dataset has 22 countries (16 destinations + 6 origin-only)."""
    response = client.get("/countries")
    assert response.status_code == 200
    countries = response.json()
    assert len(countries) == 22


def test_list_all_countries_sorted_alphabetically(client):
    response = client.get("/countries")
    assert response.status_code == 200
    names = [c["name"] for c in response.json()]
    assert names == sorted(names)


def test_list_all_countries_schema(client):
    """Every country object has the expected fields."""
    response = client.get("/countries")
    assert response.status_code == 200
    for c in response.json():
        assert "id" in c
        assert "code" in c
        assert "name" in c
        assert "is_destination" in c
        assert "is_origin" in c


def test_list_destinations_only(client):
    response = client.get("/countries/destinations")
    assert response.status_code == 200
    destinations = response.json()
    assert len(destinations) == 16  # 16 destination countries seeded
    for c in destinations:
        assert c["is_destination"] is True


def test_list_origins_only(client):
    response = client.get("/countries/origins")
    assert response.status_code == 200
    origins = response.json()
    # Origins include: IN, US, UK, CA, DE, FR, CN, NG, PK, BD, NP, UZ, VN
    # (countries with is_origin=True)
    assert len(origins) >= 1
    for c in origins:
        assert c["is_origin"] is True


def test_get_country_by_code(client):
    response = client.get("/countries/US")
    assert response.status_code == 200
    country = response.json()
    assert country["code"] == "US"
    assert country["name"] == "United States"
    assert country["is_destination"] is True


def test_get_country_code_case_insensitive(client):
    """Route uppercases the code before querying."""
    response = client.get("/countries/us")
    assert response.status_code == 200
    assert response.json()["code"] == "US"


def test_get_country_not_found(client):
    response = client.get("/countries/ZZ")
    assert response.status_code == 404


def test_india_is_origin(client):
    response = client.get("/countries/IN")
    assert response.status_code == 200
    india = response.json()
    assert india["is_origin"] is True


def test_destination_countries_include_expected_set(client):
    response = client.get("/countries/destinations")
    codes = {c["code"] for c in response.json()}
    expected = {"US", "UK", "CA", "AU", "DE", "FR", "CN", "JP", "NL", "IE", "NZ", "SG", "KR", "AE", "IT", "IN"}
    assert expected.issubset(codes)
