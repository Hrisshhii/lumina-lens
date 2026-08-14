from datetime import datetime, timezone

from skyfield.api import Star, load, wgs84

from app.engines.astronomy.star_data import STARS


class AstronomyEngine:
    def __init__(self):
        self.ts = load.timescale()

        # Load planetary ephemeris so we can calculate
        # the observer's position relative to Earth.
        self.planets = load("de421.bsp")
        self.earth = self.planets["earth"]

    def get_star_position(
        self,
        star_data: dict,
        latitude: float,
        longitude: float,
        observation_time: datetime | None = None,
    ):
        if observation_time is None:
            observation_time = datetime.now(timezone.utc)

        if observation_time.tzinfo is None:
            observation_time = observation_time.replace(
                tzinfo=timezone.utc
            )

        t = self.ts.from_datetime(observation_time)

        # Create the star from its catalog coordinates.
        star = Star(
            ra_hours=star_data["ra_hours"],
            dec_degrees=star_data["dec_degrees"],
        )

        # Create a topocentric observer:
        # Earth + the observer's geographic location.
        observer_location = wgs84.latlon(
            latitude,
            longitude,
        )

        observer = self.earth + observer_location

        # Calculate the star's apparent position from the observer.
        astrometric = observer.at(t).observe(star)
        apparent = astrometric.apparent()

        altitude, azimuth, distance = apparent.altaz()

        return {
            "name": star_data["name"],
            "altitude": round(altitude.degrees, 3),
            "azimuth": round(azimuth.degrees, 3),
            "distance_au": round(distance.au, 6),
            "magnitude": star_data["magnitude"],
        }

    def get_visible_stars(
        self,
        latitude: float,
        longitude: float,
        observation_time: datetime | None = None,
    ):
        stars = []

        for star in STARS:
            position = self.get_star_position(
                star,
                latitude,
                longitude,
                observation_time,
            )

            # Above the mathematical horizon.
            if position["altitude"] > 0:
                stars.append(position)

        return stars