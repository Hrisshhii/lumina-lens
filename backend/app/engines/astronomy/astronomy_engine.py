from datetime import datetime, timezone
from skyfield.api import Star, load, wgs84  # type: ignore
from skyfield.data import hipparcos # type: ignore

# Mapping famous stars from Hipparcos catalog numbers to human-readable names
PROMINENT_STARS = {
    32349: "Sirius",
    91262: "Vega",
    27989: "Betelgeuse",
    11767: "Polaris",
    100453: "Deneb",
    97649: "Altair",
    24436: "Rigel",
    21421: "Aldebaran",
    71683: "Alpha Centauri",
    30438: "Canopus",
    69673: "Arcturus",
    65474: "Spica",
    37826: "Pollux",
    37279: "Castor",
    80763: "Antares",
}


class AstronomyEngine:
    def __init__(self):
        self.ts = load.timescale()

        # Load planetary ephemeris for Earth observer positioning
        self.planets = load("de421.bsp")
        self.earth = self.planets["earth"]

        # Load Hipparcos catalog using Skyfield
        with load.open(hipparcos.URL) as f:
            df = hipparcos.load_dataframe(f)

        # Filter out invalid coordinates and stars dimmer than naked-eye threshold (magnitude <= 6.0)
        # This keeps ~5,000 bright stars instead of all 118,218.
        self.bright_stars = df[df["ra_degrees"].notnull() & (df["magnitude"] <= 6.0)].copy()

        # Create a single vectorized Star object for all bright stars
        self.stars = Star.from_dataframe(self.bright_stars)

    def get_star_position(
        self,
        star_data: dict,
        latitude: float,
        longitude: float,
        observation_time: datetime | None = None,
    ):
        """Calculates apparent position for a single star (used for custom targets or manual RA/Dec)."""
        if observation_time is None:
            observation_time = datetime.now(timezone.utc)
        elif observation_time.tzinfo is None:
            observation_time = observation_time.replace(tzinfo=timezone.utc)

        t = self.ts.from_datetime(observation_time)
        star = Star(
            ra_hours=star_data["ra_hours"],
            dec_degrees=star_data["dec_degrees"],
        )

        observer = self.earth + wgs84.latlon(latitude, longitude)
        astrometric = observer.at(t).observe(star)
        apparent = astrometric.apparent()
        altitude, azimuth, distance = apparent.altaz()

        return {
            "name": star_data.get("name", "Unknown"),
            "altitude": round(altitude.degrees, 3),
            "azimuth": round(azimuth.degrees, 3),
            "distance_au": round(distance.au, 6),
            "magnitude": star_data.get("magnitude", 0.0),
        }

    def get_visible_stars(
        self,
        latitude: float,
        longitude: float,
        observation_time: datetime | None = None,
        limit: int = 100,
    ):
        """
        Calculates positions for all visible stars using vectorized NumPy math.
        Runs in ~20ms for 5,000 stars.
        """
        if observation_time is None:
            observation_time = datetime.now(timezone.utc)
        elif observation_time.tzinfo is None:
            observation_time = observation_time.replace(tzinfo=timezone.utc)

        t = self.ts.from_datetime(observation_time)
        observer = self.earth + wgs84.latlon(latitude, longitude)

        # 1. Vectorized observation of all stars at once
        apparent = observer.at(t).observe(self.stars).apparent()
        alt, az, _ = apparent.altaz()

        alt_degrees = alt.degrees
        az_degrees = az.degrees

        # 2. Boolean mask for stars above the mathematical horizon
        is_above_horizon = alt_degrees > 0

        # 3. Filter DataFrame using the mask
        visible_df = self.bright_stars[is_above_horizon].copy()
        visible_df["altitude"] = alt_degrees[is_above_horizon]
        visible_df["azimuth"] = az_degrees[is_above_horizon]

        # 4. Sort by brightness (lower magnitude = brighter) and cap results
        visible_df = visible_df.sort_values("magnitude")
        if limit:
            visible_df = visible_df.head(limit)

        # 5. Format results
        return [
            {
                "hip": int(hip),
                "name": PROMINENT_STARS.get(int(hip), f"HIP {hip}"),
                "altitude": round(float(row["altitude"]), 3),
                "azimuth": round(float(row["azimuth"]), 3),
                "magnitude": round(float(row["magnitude"]), 2),
            }
            for hip, row in visible_df.iterrows()
        ]