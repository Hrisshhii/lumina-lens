from fastapi import APIRouter, HTTPException, Path

from app.models import Star
from app.services import star_service

router = APIRouter(
    prefix="/stars",
    tags=["Stars"],
)


@router.get(
    "/{hip_id}",
    response_model=Star,
    summary="Get star metadata by Hipparcos ID",
    description="Retrieves identity, scientific coordinates, and metadata for a star in the Hipparcos catalog.",
)
def get_star(
    hip_id: int = Path(..., description="Hipparcos catalog identifier (HIP ID)", ge=1),
):
    star = star_service.get_star_by_hip(hip_id)
    if star is None:
        raise HTTPException(
            status_code=404,
            detail=f"Star with Hipparcos ID {hip_id} not found in catalog",
        )
    return star
