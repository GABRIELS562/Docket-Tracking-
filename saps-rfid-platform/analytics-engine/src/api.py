"""
FastAPI REST API for Spatial Analytics Engine

Provides REST endpoints for Node.js backend integration.
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
import logging
import os

from .spatial_analyzer import SpatialAnalyzer, ItemPosition, ZoneConfig
from .clustering import ClusteringEngine
from .density import DensityAnalyzer


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="RFID Spatial Analytics Engine",
    description="Advanced 3D spatial analysis using Open3D for RFID tracking",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzer
analyzer = SpatialAnalyzer()


# Pydantic models for request/response
class ItemPositionRequest(BaseModel):
    """Item position for analysis."""
    item_id: str = Field(..., alias="itemId")
    epc: str
    x: float
    y: float
    z: float
    zone_id: str = Field(..., alias="zoneId")
    last_seen: Optional[datetime] = Field(None, alias="lastSeen")
    rssi: float = -50.0

    class Config:
        populate_by_name = True


class AnalysisRequest(BaseModel):
    """Request body for spatial analysis."""
    items: List[ItemPositionRequest]
    options: Optional[Dict[str, Any]] = None


class ClusterResponse(BaseModel):
    """Cluster information."""
    cluster_id: int = Field(..., alias="clusterId")
    centroid: Dict[str, float]
    size: int
    radius: float
    density: float
    item_ids: List[str] = Field(..., alias="itemIds")
    zone_distribution: Dict[str, int] = Field(..., alias="zoneDistribution")

    class Config:
        populate_by_name = True


class ZoneDensityResponse(BaseModel):
    """Zone density information."""
    zone_id: str = Field(..., alias="zoneId")
    zone_name: str = Field(..., alias="zoneName")
    item_count: int = Field(..., alias="itemCount")
    capacity: int
    utilization: float
    is_overcrowded: bool = Field(..., alias="isOvercrowded")

    class Config:
        populate_by_name = True


class AnalysisResponse(BaseModel):
    """Complete analysis response."""
    timestamp: datetime
    total_items: int = Field(..., alias="totalItems")
    clusters: List[Dict[str, Any]]
    zone_densities: List[Dict[str, Any]] = Field(..., alias="zoneDensities")
    hotspots: List[Dict[str, Any]]
    overcrowded_zones: List[str] = Field(..., alias="overcrowdedZones")
    optimization_suggestions: List[Dict[str, Any]] = Field(..., alias="optimizationSuggestions")
    processing_time_ms: float = Field(..., alias="processingTimeMs")

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    open3d_available: bool = Field(..., alias="open3dAvailable")
    uptime_seconds: float = Field(..., alias="uptimeSeconds")


# Track startup time
startup_time = datetime.now()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    from .spatial_analyzer import OPEN3D_AVAILABLE

    uptime = (datetime.now() - startup_time).total_seconds()

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        open3dAvailable=OPEN3D_AVAILABLE,
        uptimeSeconds=uptime,
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_items(request: AnalysisRequest):
    """
    Perform spatial analysis on item positions.

    Returns clusters, zone densities, hotspots, and optimization suggestions.
    """
    try:
        # Convert request items to ItemPosition objects
        items = [
            ItemPosition(
                item_id=item.item_id,
                epc=item.epc,
                x=item.x,
                y=item.y,
                z=item.z,
                zone_id=item.zone_id,
                last_seen=item.last_seen or datetime.now(),
                rssi=item.rssi,
            )
            for item in request.items
        ]

        # Apply options if provided
        if request.options:
            if "clusteringEps" in request.options:
                analyzer.clustering_eps = request.options["clusteringEps"]
            if "clusteringMinSamples" in request.options:
                analyzer.clustering_min_samples = request.options["clusteringMinSamples"]
            if "overcrowdingThreshold" in request.options:
                analyzer.overcrowding_threshold = request.options["overcrowdingThreshold"]

        # Run analysis
        result = analyzer.analyze(items)

        return AnalysisResponse(
            timestamp=result.timestamp,
            totalItems=result.total_items,
            clusters=[c.to_dict() for c in result.clusters],
            zoneDensities=[z.to_dict() for z in result.zone_densities],
            hotspots=result.hotspots,
            overcrowdedZones=result.overcrowded_zones,
            optimizationSuggestions=result.optimization_suggestions,
            processingTimeMs=result.processing_time_ms,
        )

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze/threejs")
async def analyze_for_threejs(request: AnalysisRequest):
    """
    Perform spatial analysis and return Three.js-compatible format.

    Includes visualization meshes, colors, and animation data.
    """
    try:
        # Convert request items
        items = [
            ItemPosition(
                item_id=item.item_id,
                epc=item.epc,
                x=item.x,
                y=item.y,
                z=item.z,
                zone_id=item.zone_id,
                last_seen=item.last_seen or datetime.now(),
                rssi=item.rssi,
            )
            for item in request.items
        ]

        # Run analysis
        result = analyzer.analyze(items)

        # Export for Three.js
        threejs_data = analyzer.export_for_threejs(result)

        return threejs_data

    except Exception as e:
        logger.error(f"Three.js export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clusters")
async def find_clusters(request: AnalysisRequest):
    """
    Find item clusters using DBSCAN algorithm.

    Returns cluster centroids, sizes, and member items.
    """
    try:
        import numpy as np

        # Convert request items
        items = [
            ItemPosition(
                item_id=item.item_id,
                epc=item.epc,
                x=item.x,
                y=item.y,
                z=item.z,
                zone_id=item.zone_id,
                last_seen=item.last_seen or datetime.now(),
                rssi=item.rssi,
            )
            for item in request.items
        ]

        # Get clustering options
        eps = request.options.get("eps", 5.0) if request.options else 5.0
        min_samples = request.options.get("minSamples", 3) if request.options else 3

        # Create clustering engine
        clustering = ClusteringEngine(eps=eps, min_samples=min_samples)

        # Get points
        points = np.array([item.to_array() for item in items])

        # Find clusters
        clusters = clustering.find_clusters(points, items)

        return {
            "clusters": [c.to_dict() for c in clusters],
            "statistics": clustering.get_cluster_statistics(clusters),
        }

    except Exception as e:
        logger.error(f"Clustering error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/density")
async def analyze_density(request: AnalysisRequest):
    """
    Analyze zone density and utilization.

    Returns per-zone metrics and redistribution suggestions.
    """
    try:
        # Convert request items
        items = [
            ItemPosition(
                item_id=item.item_id,
                epc=item.epc,
                x=item.x,
                y=item.y,
                z=item.z,
                zone_id=item.zone_id,
                last_seen=item.last_seen or datetime.now(),
                rssi=item.rssi,
            )
            for item in request.items
        ]

        # Get density options
        threshold = request.options.get("overcrowdingThreshold", 0.85) if request.options else 0.85

        # Create density analyzer
        density_analyzer = DensityAnalyzer(overcrowding_threshold=threshold)

        # Analyze zones
        densities = density_analyzer.analyze_zones(items, analyzer.zones)

        return {
            "zoneDensities": [d.to_dict() for d in densities],
            "statistics": density_analyzer.get_density_statistics(densities),
            "redistributionPlan": density_analyzer.get_redistribution_plan(densities),
        }

    except Exception as e:
        logger.error(f"Density analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/heatmap")
async def generate_heatmap(
    request: AnalysisRequest,
    grid_size: float = Query(5.0, description="Size of heatmap grid cells"),
):
    """
    Generate 3D density heatmap.

    Returns grid cells with density values for visualization.
    """
    try:
        # Convert request items
        items = [
            ItemPosition(
                item_id=item.item_id,
                epc=item.epc,
                x=item.x,
                y=item.y,
                z=item.z,
                zone_id=item.zone_id,
                last_seen=item.last_seen or datetime.now(),
                rssi=item.rssi,
            )
            for item in request.items
        ]

        # Create density analyzer
        density_analyzer = DensityAnalyzer()

        # Generate heatmap
        heatmap = density_analyzer.generate_heatmap(items, grid_size=grid_size)

        # Export for Three.js
        from .exporter import ThreeJSExporter
        exporter = ThreeJSExporter(heatmap_cell_size=grid_size)

        return exporter.export_heatmap(heatmap)

    except Exception as e:
        logger.error(f"Heatmap generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/zones")
async def get_zones():
    """Get all zone configurations."""
    return {
        "zones": [
            {
                "zoneId": zone_id,
                "name": zone.name,
                "minBounds": {"x": zone.min_bounds[0], "y": zone.min_bounds[1], "z": zone.min_bounds[2]},
                "maxBounds": {"x": zone.max_bounds[0], "y": zone.max_bounds[1], "z": zone.max_bounds[2]},
                "capacity": zone.capacity,
                "priority": zone.priority,
                "center": {"x": zone.center[0], "y": zone.center[1], "z": zone.center[2]},
                "volume": zone.volume,
            }
            for zone_id, zone in analyzer.zones.items()
        ]
    }


@app.get("/api/stats")
async def get_statistics(request: AnalysisRequest):
    """Get quick statistics without full analysis."""
    try:
        # Convert request items
        items = [
            ItemPosition(
                item_id=item.item_id,
                epc=item.epc,
                x=item.x,
                y=item.y,
                z=item.z,
                zone_id=item.zone_id,
                last_seen=item.last_seen or datetime.now(),
                rssi=item.rssi,
            )
            for item in request.items
        ]

        return analyzer.get_zone_stats(items)

    except Exception as e:
        logger.error(f"Statistics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Background analysis task (for async processing)
analysis_cache: Dict[str, Any] = {}


@app.post("/api/analyze/async")
async def analyze_async(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    task_id: str = Query(..., description="Unique task identifier"),
):
    """
    Start async analysis and return immediately.

    Poll /api/analyze/status/{task_id} for results.
    """
    analysis_cache[task_id] = {"status": "processing", "result": None}

    async def run_analysis():
        try:
            items = [
                ItemPosition(
                    item_id=item.item_id,
                    epc=item.epc,
                    x=item.x,
                    y=item.y,
                    z=item.z,
                    zone_id=item.zone_id,
                    last_seen=item.last_seen or datetime.now(),
                    rssi=item.rssi,
                )
                for item in request.items
            ]

            result = analyzer.analyze(items)
            analysis_cache[task_id] = {
                "status": "completed",
                "result": result.to_dict(),
            }
        except Exception as e:
            analysis_cache[task_id] = {
                "status": "error",
                "error": str(e),
            }

    background_tasks.add_task(run_analysis)

    return {"taskId": task_id, "status": "processing"}


@app.get("/api/analyze/status/{task_id}")
async def get_analysis_status(task_id: str):
    """Get status of async analysis task."""
    if task_id not in analysis_cache:
        raise HTTPException(status_code=404, detail="Task not found")

    return analysis_cache[task_id]


def run_server(host: str = "0.0.0.0", port: int = 8001):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
