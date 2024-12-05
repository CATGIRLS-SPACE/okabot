import requests

def fetch_earthquake_data():
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    response = requests.get(url)
    data = response.json()

    for feature in data["features"]:
        place = feature["properties"]["place"]
        mag = feature["properties"]["mag"]
        time = feature["properties"]["time"]

        # Filter for Japan
        if "Japan" in place:
            print(f"Magnitude {mag} earthquake in {place} at {time}")

if __name__ == "__main__":
    fetch_earthquake_data()