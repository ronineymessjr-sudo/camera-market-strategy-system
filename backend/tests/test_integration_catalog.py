from fastapi.testclient import TestClient

from app.main import app


def test_connector_catalog_describes_byok_without_secret_values():
    response = TestClient(app).get("/api/integrations/catalog")

    assert response.status_code == 200
    catalog = response.json()
    assert {item["provider"] for item in catalog} == {"jd", "taobao", "pdd", "ebay", "amazon"}

    for item in catalog:
        assert item["credential_mode"] == "bring_your_own"
        assert item["secret_storage"] == "private_backend_environment"
        assert item["configured"] in {True, False}
        assert item["required_env"]
        assert all(name == name.upper() for name in item["required_env"])
        assert item["setup_guide"].startswith("https://github.com/")
        assert set(item) == {
            "provider",
            "display_name",
            "configured",
            "mode",
            "credential_mode",
            "secret_storage",
            "required_env",
            "setup_guide",
        }
