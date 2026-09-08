import pandas as pd
from skyfield.api import load
from skyfield.data import hipparcos

from app.models import Star


# Enriched scientific and cultural metadata for prominent stars
ENRICHED_METADATA: dict[int, dict] = {
    32349: {
        "primary_name": "Sirius",
        "alternate_names": ["Dog Star", "Alpha Canis Majoris", "HR 2491", "HD 48915"],
        "bayer_designation": "Alpha Canis Majoris",
        "flamsteed_designation": "9 Canis Majoris",
        "constellation": "Canis Major",
        "spectral_type": "A1V + DA2",
        "description": "Sirius is the brightest star in the night sky. It is a binary star system consisting of a main-sequence star (Sirius A) and a faint white dwarf companion (Sirius B).",
    },
    91262: {
        "primary_name": "Vega",
        "alternate_names": ["Alpha Lyrae", "HR 7001", "HD 172167"],
        "bayer_designation": "Alpha Lyrae",
        "flamsteed_designation": "3 Lyrae",
        "constellation": "Lyra",
        "spectral_type": "A0Va",
        "description": "Vega is the brightest star in the northern constellation of Lyra and the fifth-brightest star in the night sky. It was the first star other than the Sun to be photographed.",
    },
    27989: {
        "primary_name": "Betelgeuse",
        "alternate_names": ["Alpha Orionis", "HR 2061", "HD 39801"],
        "bayer_designation": "Alpha Orionis",
        "flamsteed_designation": "58 Orionis",
        "constellation": "Orion",
        "spectral_type": "M1-M2Ia-ab",
        "description": "Betelgeuse is a prominent red supergiant in the constellation of Orion. It is one of the largest stars visible to the naked eye and is nearing the end of its life cycle.",
    },
    11767: {
        "primary_name": "Polaris",
        "alternate_names": ["North Star", "Pole Star", "Alpha Ursae Minoris", "HR 424", "HD 8890"],
        "bayer_designation": "Alpha Ursae Minoris",
        "flamsteed_designation": "1 Ursae Minoris",
        "constellation": "Ursa Minor",
        "spectral_type": "F7Ib",
        "description": "Polaris is the North Star, currently positioned very close to the north celestial pole. It has served as a critical navigational reference point for centuries.",
    },
    24436: {
        "primary_name": "Rigel",
        "alternate_names": ["Beta Orionis", "HR 1713", "HD 34085"],
        "bayer_designation": "Beta Orionis",
        "flamsteed_designation": "19 Orionis",
        "constellation": "Orion",
        "spectral_type": "B8Ia",
        "description": "Rigel is a luminous blue supergiant star in the constellation Orion. It is the most luminous star in our local region of the Milky Way.",
    },
    69673: {
        "primary_name": "Arcturus",
        "alternate_names": ["Alpha Boötis", "HR 5340", "HD 124897"],
        "bayer_designation": "Alpha Boötis",
        "flamsteed_designation": "16 Boötis",
        "constellation": "Boötes",
        "spectral_type": "K1.5III",
        "description": "Arcturus is an orange giant star and the brightest star in the northern celestial hemisphere. It is an ancient star moving rapidly through the Milky Way halo.",
    },
    21421: {
        "primary_name": "Aldebaran",
        "alternate_names": ["Alpha Tauri", "HR 1457", "HD 29139", "Eye of Taurus"],
        "bayer_designation": "Alpha Tauri",
        "flamsteed_designation": "87 Tauri",
        "constellation": "Taurus",
        "spectral_type": "K5+III",
        "description": "Aldebaran is a giant red-orange star located in the zodiac constellation of Taurus. It appears as the fiery eye of the celestial bull.",
    },
    65474: {
        "primary_name": "Spica",
        "alternate_names": ["Alpha Virginis", "HR 5056", "HD 116658"],
        "bayer_designation": "Alpha Virginis",
        "flamsteed_designation": "67 Virginis",
        "constellation": "Virgo",
        "spectral_type": "B1III-IV + B2V",
        "description": "Spica is a spectroscopic binary star and the brightest object in the constellation of Virgo. The two stars orbit each other every 4 days.",
    },
    80763: {
        "primary_name": "Antares",
        "alternate_names": ["Alpha Scorpii", "HR 6134", "HD 148478", "Heart of the Scorpion"],
        "bayer_designation": "Alpha Scorpii",
        "flamsteed_designation": "21 Scorpii",
        "constellation": "Scorpius",
        "spectral_type": "M1.5Iab-Ib",
        "description": "Antares is a distinctively red supergiant star marking the heart of the constellation Scorpius. Its name means 'rival to Mars' due to its reddish appearance.",
    },
    97649: {
        "primary_name": "Altair",
        "alternate_names": ["Alpha Aquilae", "HR 7557", "HD 187642"],
        "bayer_designation": "Alpha Aquilae",
        "flamsteed_designation": "53 Aquilae",
        "constellation": "Aquila",
        "spectral_type": "A7V",
        "description": "Altair is the brightest star in the constellation Aquila and forms the Summer Triangle with Vega and Deneb. It rotates rapidly, completing a spin in just 9 hours.",
    },
    100453: {
        "primary_name": "Deneb",
        "alternate_names": ["Alpha Cygni", "HR 7924", "HD 197345"],
        "bayer_designation": "Alpha Cygni",
        "flamsteed_designation": "50 Cygni",
        "constellation": "Cygnus",
        "spectral_type": "A2Ia",
        "description": "Deneb is a white supergiant star that forms the tail of Cygnus the Swan and the northern vertex of the Summer Triangle. It is thousands of times more luminous than the Sun.",
    },
    37826: {
        "primary_name": "Pollux",
        "alternate_names": ["Beta Geminorum", "HR 2990", "HD 62509"],
        "bayer_designation": "Beta Geminorum",
        "flamsteed_designation": "78 Geminorum",
        "constellation": "Gemini",
        "spectral_type": "K0III",
        "description": "Pollux is an orange-hued giant star and the brightest star in the constellation Gemini. It is confirmed to host an extrasolar giant planet.",
    },
    37279: {
        "primary_name": "Castor",
        "alternate_names": ["Alpha Geminorum", "HR 2891", "HD 60179"],
        "bayer_designation": "Alpha Geminorum",
        "flamsteed_designation": "66 Geminorum",
        "constellation": "Gemini",
        "spectral_type": "A1V + A2Vm",
        "description": "Castor is a fascinating sextuple star system appearing as a single bright star in Gemini, consisting of three pairs of binary stars orbiting a common center.",
    },
    71683: {
        "primary_name": "Alpha Centauri",
        "alternate_names": ["Rigil Kentaurus", "Alpha1 Centauri", "HR 5459", "HD 128620"],
        "bayer_designation": "Alpha Centauri",
        "constellation": "Centaurus",
        "spectral_type": "G2V",
        "description": "Alpha Centauri is the closest star system to the Solar System, located just 4.37 light-years away in the southern constellation of Centaurus.",
    },
    30438: {
        "primary_name": "Canopus",
        "alternate_names": ["Alpha Carinae", "HR 2326", "HD 45348"],
        "bayer_designation": "Alpha Carinae",
        "constellation": "Carina",
        "spectral_type": "A9II",
        "description": "Canopus is a bright white giant and the second-brightest star in the night sky. It is widely used in spacecraft attitude control due to its brightness.",
    },
}


class StarService:
    """
    Service responsible for star identity, metadata resolution,
    and profile assembly from the Hipparcos catalog and enriched metadata.
    """

    def __init__(self, catalog_df: pd.DataFrame | None = None):
        if catalog_df is None:
            with load.open(hipparcos.URL) as f:
                self.df = hipparcos.load_dataframe(f)
        else:
            self.df = catalog_df

    def get_star_by_hip(self, hip_id: int) -> Star | None:
        """
        Retrieves complete metadata profile for a star by its Hipparcos catalog identifier.
        Returns None if hip_id does not exist in the catalog.
        """
        if hip_id not in self.df.index:
            return None

        row = self.df.loc[hip_id]
        enriched = ENRICHED_METADATA.get(hip_id, {})

        # Calculate distance in light-years from parallax (if positive)
        # Distance (parsecs) = 1000 / parallax (mas)
        # 1 parsec ≈ 3.26156 light-years
        parallax = float(row["parallax_mas"]) if pd.notnull(row["parallax_mas"]) else None
        distance_ly: float | None = None
        if parallax is not None and parallax > 0:
            distance_ly = round(3261.56 / parallax, 2)

        # Primary name resolution: enriched name -> default "HIP <id>"
        primary_name = enriched.get("primary_name", f"HIP {hip_id}")

        return Star(
            hip_id=hip_id,
            primary_name=primary_name,
            alternate_names=enriched.get("alternate_names", []),
            bayer_designation=enriched.get("bayer_designation"),
            flamsteed_designation=enriched.get("flamsteed_designation"),
            constellation=enriched.get("constellation"),
            right_ascension_hours=(
                round(float(row["ra_hours"]), 4) if pd.notnull(row["ra_hours"]) else None
            ),
            declination_degrees=(
                round(float(row["dec_degrees"]), 4) if pd.notnull(row["dec_degrees"]) else None
            ),
            parallax_mas=round(parallax, 2) if parallax is not None else None,
            proper_motion_ra_mas=(
                round(float(row["ra_mas_per_year"]), 2)
                if pd.notnull(row["ra_mas_per_year"])
                else None
            ),
            proper_motion_dec_mas=(
                round(float(row["dec_mas_per_year"]), 2)
                if pd.notnull(row["dec_mas_per_year"])
                else None
            ),
            magnitude=(
                round(float(row["magnitude"]), 2) if pd.notnull(row["magnitude"]) else None
            ),
            spectral_type=enriched.get("spectral_type"),
            distance_light_years=distance_ly,
            description=enriched.get(
                "description",
                f"Catalog star in the Hipparcos astrometry database (HIP {hip_id}).",
            ),
        )


# Singleton instance
star_service = StarService()
