from pydantic import BaseModel, Field # type: ignore


class Star(BaseModel):
    """
    Represents the identity and astronomical metadata
    of a star in the Lumina Lens catalog.
    """

    # Primary catalog identifier
    hip_id: int = Field(..., description="Hipparcos catalog identifier")

    # Human-readable identity
    primary_name: str | None = Field(
        default=None,
        description="Primary/common name of the star",
    )

    alternate_names: list[str] = Field(
        default_factory=list,
        description="Other known names or designations",
    )

    bayer_designation: str | None = Field(
        default=None,
        description="Bayer designation, if available",
    )

    flamsteed_designation: str | None = Field(
        default=None,
        description="Flamsteed designation, if available",
    )

    constellation: str | None = Field(
        default=None,
        description="Constellation containing the star",
    )

    # Astrometric data
    right_ascension_hours: float | None = Field(
        default=None,
        description="Right ascension in hours",
    )

    declination_degrees: float | None = Field(
        default=None,
        description="Declination in degrees",
    )

    parallax_mas: float | None = Field(
        default=None,
        description="Parallax in milliarcseconds",
    )

    proper_motion_ra_mas: float | None = Field(
        default=None,
        description="Proper motion in right ascension",
    )

    proper_motion_dec_mas: float | None = Field(
        default=None,
        description="Proper motion in declination",
    )

    # Photometric / physical information
    magnitude: float | None = Field(
        default=None,
        description="Visual magnitude",
    )

    spectral_type: str | None = Field(
        default=None,
        description="Spectral classification",
    )

    distance_light_years: float | None = Field(
        default=None,
        description="Estimated distance in light-years",
    )

    # User-facing information
    description: str | None = Field(
        default=None,
        description="Human-readable description of the star",
    )