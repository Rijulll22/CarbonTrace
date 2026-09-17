import requests
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("1. POST /api/v1/seed")
    r = requests.post(f"{BASE_URL}/api/v1/seed")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n2. GET /api/v1/carbon/summary/1")
    r = requests.get(f"{BASE_URL}/api/v1/carbon/summary/1")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n3. POST /api/v1/carbon/upload")
    with open("sample.csv", "r") as f:
        csv_content = f.read()
    r = requests.post(f"{BASE_URL}/api/v1/carbon/upload", json={"company_id": 1, "filename": "sample.csv", "content": csv_content})
    print(r.status_code, r.json())
    assert r.status_code in (200, 201)

    print("\n4. GET /api/v1/carbon/activities/1")
    r = requests.get(f"{BASE_URL}/api/v1/carbon/activities/1")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n5. GET /api/v1/verify/entries")
    r = requests.get(f"{BASE_URL}/api/v1/verify/entries")
    print(r.status_code)
    entries = r.json()
    assert r.status_code == 200
    assert len(entries) > 0
    entry_id = entries[-1]["entry_id"]
    print("Got entry_id:", entry_id)

    print("\n6. GET /api/v1/verify/validate")
    r = requests.get(f"{BASE_URL}/api/v1/verify/validate")
    print(r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["is_verified"] == True

    print(f"\n7. POST /api/v1/verify/tamper/{entry_id}")
    r = requests.post(f"{BASE_URL}/api/v1/verify/tamper/{entry_id}")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n8. GET /api/v1/verify/validate (Expected False)")
    r = requests.get(f"{BASE_URL}/api/v1/verify/validate")
    print(r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["is_verified"] == False

    print("\n9. POST /api/v1/verify/reset")
    r = requests.post(f"{BASE_URL}/api/v1/verify/reset")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n10. GET /api/v1/verify/validate (Expected True)")
    r = requests.get(f"{BASE_URL}/api/v1/verify/validate")
    print(r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["is_verified"] == True

    print("\n11. POST /api/v1/optimize")
    r = requests.post(f"{BASE_URL}/api/v1/optimize", json={"company_id": 1, "target_reduction_percentage": 10.0, "budget_inr": 1000000.0})
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n12. POST /api/v1/ai/explain")
    r = requests.post(f"{BASE_URL}/api/v1/ai/explain", json={"context_type": "emissions", "context_id": 1, "question": "Explain emissions."})
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n13. GET /api/v1/report/1")
    r = requests.get(f"{BASE_URL}/api/v1/report/1")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n14. POST /api/v1/report/sign")
    r = requests.post(f"{BASE_URL}/api/v1/report/sign", json={"company_id": 1, "signer_name": "Demo Signer", "signer_role": "CEO", "is_confirmed": True})
    print(r.status_code, r.json())
    assert r.status_code in (200, 201)

    print("\n15. GET /api/v1/report/sign/1")
    r = requests.get(f"{BASE_URL}/api/v1/report/sign/1")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n16. GET /api/v1/report/1")
    r = requests.get(f"{BASE_URL}/api/v1/report/1")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n17. GET /api/v1/report/1/pdf")
    r = requests.get(f"{BASE_URL}/api/v1/report/1/pdf")
    print(r.status_code, "Content-Type:", r.headers.get("Content-Type"))
    assert r.status_code == 200
    assert r.headers.get("Content-Type") == "application/pdf"
    with open("test_report.pdf", "wb") as f:
        f.write(r.content)
    with open("test_report.pdf", "rb") as f:
        header = f.read(5)
        assert header == b"%PDF-", f"Expected %PDF-, got {header}"
        print("File starts with %PDF-")

    print("\nALL TESTS PASSED")

if __name__ == "__main__":
    run_tests()
