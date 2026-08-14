from datetime import datetime
from fastapi import APIRouter, Query
from app.engines.astronomy.astronomy_engine import AstronomyEngine


router=APIRouter(
    prefix="/sky",
    tags=["Sky"],
)

astronomy_engine=AstronomyEngine()


@router.get("/visible")
def get_visible_stars(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    stars=astronomy_engine.get_visible_stars(
        latitude=latitude,
        longitude=longitude,
        observation_time=datetime.now().astimezone(),
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "stars": stars,
    }