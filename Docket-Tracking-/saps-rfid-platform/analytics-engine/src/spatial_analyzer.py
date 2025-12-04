"""
Spatial Analyzer - Main orchestrator for 3D spatial analysis

Uses Open3D for advanced point cloud analysis, clustering,
and spatial optimization of RFID-tracked items.
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import logging

try:
    import open3d as o3d
    OPEN3D_AVAILABLE = True
except ImportError:
    OPEN3D_AVAILABLE = False
    logging.warning("Open3D not available. Spatial analysis will use fallback methods.")

from .clustering import ClusteringEngine, Cluster
from .density import DensityAnalyzer, ZoneDensity
from .exporter import ThreeJSExporter


@dataclass
class ItemPosition:
    """Represents an item's 3D position with metadata."""
    item_id: str
    epc: str
    x: float
    y: float
    z: float
    zone_id: str
    last_seen: datetime
    rssi: float = -50.0

    def to_array(self) -> np.ndarray:
        """Convert to numpy array [x, y, z]."""
        return np.array([self.x, self.y, self.z])


@dataclass
class SpatialAnalysisResult:
    """Complete spatial analysis result."""
    timestamp: datetime
    total_items: int
    clusters: List[Cluster]
    zone_densities: List[ZoneDensity]
    hotspots: List[Dict[str, Any]]
    overcrowded_zones: List[str]
    optimization_suggestions: List[Dict[str, Any]]
    processing_time_ms: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "totalItems": self.total_items,
            "clusters": [c.to_dict() for c in self.clusters],
            "zoneDensities": [z.to_dict() for z in self.zone_densities],
            "hotspots": self.hotspots,
            "overcrowdedZones": self.overcrowded_zones,
            "optimizationSuggestions": self.optimization_suggestions,
            "processingTimeMs": self.processing_time_ms,
        }


@dataclass
class ZoneConfig:
    """Zone configuration with bounds and capacity."""
    zone_id: str
    name: str
    min_bounds: Tuple[float, float, float]  # (x, y, z)
    max_bounds: Tuple[float, float, float]
    capacity: int
    priority: str = "normal"  # low, normal, high, critical

    @property
    def center(self) -> Tuple[float, float, float]:
        """Get zone center point."""
        return (
            (self.min_bounds[0] + self.max_bounds[0]) / 2,
            (self.min_bounds[1] + self.max_bounds[1]) / 2,
            (self.min_bounds[2] + self.max_bounds[2]) / 2,
        )

    @property
    def volume(self) -> float:
        """Calculate zone volume."""
        dx = self.max_bounds[0] - self.min_bounds[0]
        dy = self.max_bounds[1] - self.min_bounds[1]
        dz = self.max_bounds[2] - self.min_bounds[2]
        return dx * dy * dz


# Default warehouse zone configuration (matches frontend)
DEFAULT_ZONES: List[ZoneConfig] = [
    ZoneConfig("receiving", "Receiving", (-50, 0, -50), (-16, 10, -16), 500, "normal"),
    ZoneConfig("storage-a", "Storage A", (-50, 0, -16), (-16, 10, 16), 1000, "normal"),
    ZoneConfig("storage-b", "Storage B", (-50, 0, 16), (-16, 10, 50), 1000, "normal"),
    ZoneConfig("storage-c", "Storage C", (-16, 0, -50), (16, 10, -16), 1000, "normal"),
    ZoneConfig("secure-storage", "Secure Storage", (-16, 0, -16), (16, 10, 16), 200, "critical"),
    ZoneConfig("storage-d", "Storage D", (-16, 0, 16), (16, 10, 50), 1000, "normal"),
    ZoneConfig("processing", "Processing", (16, 0, -50), (50, 10, -16), 300, "high"),
    ZoneConfig("shipping", "Shipping", (16, 0, -16), (50, 10, 16), 400, "normal"),
    ZoneConfig("returns", "Returns", (16, 0, 16), (50, 10, 50), 300, "normal"),
]


class SpatialAnalyzer:
    """
    Main orchestrator for 3D spatial analysis.

    Uses Open3D for advanced point cloud processing:
    - DBSCAN clustering for item hotspot detection
    - Density analysis for zone utilization
    - Overcrowding detection and alerts
    - Spatial optimization recommendations

    Example:
        analyzer = SpatialAnalyzer()

        # Add item positions
        items = [
            ItemPosition("item-1", "EPC001", 10.0, 1.5, 20.0, "storage-a", datetime.now()),
            ItemPosition("item-2", "EPC002", 11.0, 1.5, 21.0, "storage-a", datetime.now()),
        ]

        # Run analysis
        result = analyzer.analyze(items)

        # Export for Three.js
        json_data = analyzer.export_for_threejs(result)
    """

    def __init__(
        self,
        zones: Optional[List[ZoneConfig]] = None,
        clustering_eps: float = 5.0,
        clustering_min_samples: int = 3,
        overcrowding_threshold: float = 0.85,
        hotspot_threshold: int = 10,
    ):
        """
        Initialize the spatial analyzer.

        Args:
            zones: Zone configurations (uses defaults if None)
            clustering_eps: DBSCAN epsilon (max distance between points)
            clustering_min_samples: Minimum points to form a cluster
            overcrowding_threshold: Zone capacity threshold for alerts (0-1)
            hotspot_threshold: Minimum items to consider a hotspot
        """
        self.zones = {z.zone_id: z for z in (zones or DEFAULT_ZONES)}
        self.clustering_eps = clustering_eps
        self.clustering_min_samples = clustering_min_samples
        self.overcrowding_threshold = overcrowding_threshold
        self.hotspot_threshold = hotspot_threshold

        self.clustering_engine = ClusteringEngine(
            eps=clustering_eps,
            min_samples=clustering_min_samples,
        )
        self.density_analyzer = DensityAnalyzer(
            overcrowding_threshold=overcrowding_threshold,
        )
        self.exporter = ThreeJSExporter()

        self.logger = logging.getLogger(__name__)

        if OPEN3D_AVAILABLE:
            self.logger.info("Open3D initialized for spatial analysis")
        else:
            self.logger.warning("Running without Open3D - using numpy fallback")

    def analyze(self, items: List[ItemPosition]) -> SpatialAnalysisResult:
        """
        Perform complete spatial analysis on item positions.

        Args:
            items: List of item positions to analyze

        Returns:
            SpatialAnalysisResult with clusters, densities, and recommendations
        """
        start_time = datetime.now()

        if not items:
            return SpatialAnalysisResult(
                timestamp=start_time,
                total_items=0,
                clusters=[],
                zone_densities=[],
                hotspots=[],
                overcrowded_zones=[],
                optimization_suggestions=[],
                processing_time_ms=0,
            )

        # Convert to point cloud
        points = np.array([item.to_array() for item in items])

        # Run clustering analysis
        clusters = self.clustering_engine.find_clusters(points, items)

        # Identify hotspots (large clusters)
        hotspots = self._identify_hotspots(clusters)

        # Analyze zone densities
        zone_densities = self.density_analyzer.analyze_zones(items, self.zones)

        # Find overcrowded zones
        overcrowded_zones = [
            zd.zone_id for zd in zone_densities
            if zd.utilization >= self.overcrowding_threshold
        ]

        # Generate optimization suggestions
        suggestions = self._generate_suggestions(
            clusters, zone_densities, overcrowded_zones, items
        )

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        result = SpatialAnalysisResult(
            timestamp=start_time,
            total_items=len(items),
            clusters=clusters,
            zone_densities=zone_densities,
            hotspots=hotspots,
            overcrowded_zones=overcrowded_zones,
            optimization_suggestions=suggestions,
            processing_time_ms=processing_time,
        )

        self.logger.info(
            f"Spatial analysis complete: {len(items)} items, "
            f"{len(clusters)} clusters, {len(overcrowded_zones)} overcrowded zones, "
            f"{processing_time:.2f}ms"
        )

        return result

    def _identify_hotspots(self, clusters: List[Cluster]) -> List[Dict[str, Any]]:
        """Identify significant hotspots from clusters."""
        hotspots = []

        for cluster in clusters:
            if cluster.size >= self.hotspot_threshold:
                hotspots.append({
                    "clusterId": cluster.cluster_id,
                    "center": {
                        "x": cluster.centroid[0],
                        "y": cluster.centroid[1],
                        "z": cluster.centroid[2],
                    },
                    "itemCount": cluster.size,
                    "radius": cluster.radius,
                    "density": cluster.density,
                    "severity": self._calculate_hotspot_severity(cluster),
                })

        # Sort by severity (highest first)
        hotspots.sort(key=lambda h: h["severity"], reverse=True)

        return hotspots

    def _calculate_hotspot_severity(self, cluster: Cluster) -> str:
        """Calculate hotspot severity based on size and density."""
        if cluster.size >= 50 or cluster.density > 0.5:
            return "critical"
        elif cluster.size >= 25 or cluster.density > 0.3:
            return "high"
        elif cluster.size >= 15 or cluster.density > 0.2:
            return "medium"
        else:
            return "low"

    def _generate_suggestions(
        self,
        clusters: List[Cluster],
        zone_densities: List[ZoneDensity],
        overcrowded_zones: List[str],
        items: List[ItemPosition],
    ) -> List[Dict[str, Any]]:
        """Generate optimization suggestions based on analysis."""
        suggestions = []

        # Suggest redistribution for overcrowded zones
        for zone_id in overcrowded_zones:
            zone = self.zones.get(zone_id)
            if not zone:
                continue

            zone_density = next(
                (zd for zd in zone_densities if zd.zone_id == zone_id), None
            )
            if not zone_density:
                continue

            # Find nearby zones with capacity
            nearby_zones = self._find_nearby_zones_with_capacity(
                zone, zone_densities
            )

            if nearby_zones:
                excess_items = zone_density.item_count - int(zone.capacity * 0.7)
                suggestions.append({
                    "type": "redistribute",
                    "priority": "high" if zone.priority == "critical" else "medium",
                    "sourceZone": zone_id,
                    "targetZones": nearby_zones[:3],
                    "itemsToMove": max(0, excess_items),
                    "reason": f"Zone {zone.name} is at {zone_density.utilization:.0%} capacity",
                    "impact": "Reduce congestion and improve access times",
                })

        # Suggest investigation for large clusters
        for cluster in clusters:
            if cluster.size >= 30:
                suggestions.append({
                    "type": "investigate",
                    "priority": "medium",
                    "location": {
                        "x": cluster.centroid[0],
                        "y": cluster.centroid[1],
                        "z": cluster.centroid[2],
                    },
                    "itemCount": cluster.size,
                    "reason": f"Unusual concentration of {cluster.size} items",
                    "impact": "May indicate processing bottleneck or misplacement",
                })

        # Suggest layout optimization for underutilized zones
        underutilized = [
            zd for zd in zone_densities
            if zd.utilization < 0.2 and zd.item_count > 0
        ]
        if underutilized and overcrowded_zones:
            suggestions.append({
                "type": "layout_optimization",
                "priority": "low",
                "underutilizedZones": [zd.zone_id for zd in underutilized],
                "overcrowdedZones": overcrowded_zones,
                "reason": "Significant capacity imbalance detected",
                "impact": "Better space utilization and reduced travel times",
            })

        return suggestions

    def _find_nearby_zones_with_capacity(
        self,
        source_zone: ZoneConfig,
        zone_densities: List[ZoneDensity],
    ) -> List[str]:
        """Find zones near the source with available capacity."""
        source_center = np.array(source_zone.center)
        candidates = []

        for zd in zone_densities:
            if zd.zone_id == source_zone.zone_id:
                continue

            zone = self.zones.get(zd.zone_id)
            if not zone:
                continue

            # Check if zone has capacity (< 70% full)
            if zd.utilization >= 0.7:
                continue

            # Calculate distance
            zone_center = np.array(zone.center)
            distance = np.linalg.norm(source_center - zone_center)

            candidates.append({
                "zone_id": zd.zone_id,
                "distance": distance,
                "available_capacity": zone.capacity - zd.item_count,
            })

        # Sort by distance
        candidates.sort(key=lambda c: c["distance"])

        return [c["zone_id"] for c in candidates]

    def create_point_cloud(self, items: List[ItemPosition]) -> Optional[Any]:
        """
        Create Open3D point cloud from item positions.

        Returns None if Open3D is not available.
        """
        if not OPEN3D_AVAILABLE:
            return None

        points = np.array([item.to_array() for item in items])

        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(points)

        # Color by zone (optional)
        colors = self._generate_zone_colors(items)
        pcd.colors = o3d.utility.Vector3dVector(colors)

        return pcd

    def _generate_zone_colors(self, items: List[ItemPosition]) -> np.ndarray:
        """Generate colors based on zone assignment."""
        zone_colors = {
            "receiving": [0.23, 0.51, 0.96],      # Blue
            "storage-a": [0.06, 0.73, 0.51],      # Green
            "storage-b": [0.06, 0.73, 0.51],      # Green
            "storage-c": [0.06, 0.73, 0.51],      # Green
            "storage-d": [0.06, 0.73, 0.51],      # Green
            "secure-storage": [0.94, 0.27, 0.27], # Red
            "processing": [0.96, 0.62, 0.04],     # Orange
            "shipping": [0.55, 0.36, 0.97],       # Purple
            "returns": [0.93, 0.31, 0.56],        # Pink
        }

        colors = []
        for item in items:
            color = zone_colors.get(item.zone_id, [0.5, 0.5, 0.5])
            colors.append(color)

        return np.array(colors)

    def export_for_threejs(self, result: SpatialAnalysisResult) -> Dict[str, Any]:
        """Export analysis result for Three.js visualization."""
        return self.exporter.export(result)

    def get_zone_stats(self, items: List[ItemPosition]) -> Dict[str, Dict[str, Any]]:
        """Get quick statistics per zone."""
        zone_stats = {}

        for zone_id, zone in self.zones.items():
            zone_items = [i for i in items if i.zone_id == zone_id]
            zone_stats[zone_id] = {
                "name": zone.name,
                "itemCount": len(zone_items),
                "capacity": zone.capacity,
                "utilization": len(zone_items) / zone.capacity if zone.capacity > 0 else 0,
                "priority": zone.priority,
            }

        return zone_stats
