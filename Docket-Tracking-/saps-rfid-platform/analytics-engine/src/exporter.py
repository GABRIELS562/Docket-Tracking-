"""
Three.js Exporter - Export spatial analysis for frontend visualization

Converts analysis results to Three.js-compatible JSON format
for rendering in the React frontend.
"""

import numpy as np
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from dataclasses import dataclass
import json
import logging

if TYPE_CHECKING:
    from .spatial_analyzer import SpatialAnalysisResult
    from .clustering import Cluster
    from .density import ZoneDensity, DensityHeatmapCell


# Color schemes for visualization
ZONE_COLORS = {
    "receiving": {"r": 0.23, "g": 0.51, "b": 0.96, "hex": "#3b82f6"},
    "storage-a": {"r": 0.06, "g": 0.73, "b": 0.51, "hex": "#10b981"},
    "storage-b": {"r": 0.06, "g": 0.73, "b": 0.51, "hex": "#10b981"},
    "storage-c": {"r": 0.06, "g": 0.73, "b": 0.51, "hex": "#10b981"},
    "storage-d": {"r": 0.06, "g": 0.73, "b": 0.51, "hex": "#10b981"},
    "secure-storage": {"r": 0.94, "g": 0.27, "b": 0.27, "hex": "#ef4444"},
    "processing": {"r": 0.96, "g": 0.62, "b": 0.04, "hex": "#f59e0b"},
    "shipping": {"r": 0.55, "g": 0.36, "b": 0.97, "hex": "#8b5cf6"},
    "returns": {"r": 0.93, "g": 0.31, "b": 0.56, "hex": "#ec4899"},
}

SEVERITY_COLORS = {
    "critical": {"r": 0.94, "g": 0.27, "b": 0.27, "hex": "#ef4444"},
    "high": {"r": 0.96, "g": 0.62, "b": 0.04, "hex": "#f59e0b"},
    "medium": {"r": 0.98, "g": 0.80, "b": 0.08, "hex": "#eab308"},
    "low": {"r": 0.06, "g": 0.73, "b": 0.51, "hex": "#10b981"},
}

HEATMAP_GRADIENT = [
    {"stop": 0.0, "color": {"r": 0.06, "g": 0.73, "b": 0.51}},   # Green
    {"stop": 0.25, "color": {"r": 0.98, "g": 0.80, "b": 0.08}},  # Yellow
    {"stop": 0.5, "color": {"r": 0.96, "g": 0.62, "b": 0.04}},   # Orange
    {"stop": 0.75, "color": {"r": 0.94, "g": 0.27, "b": 0.27}},  # Red
    {"stop": 1.0, "color": {"r": 0.80, "g": 0.10, "b": 0.10}},   # Dark Red
]


@dataclass
class ThreeJSMesh:
    """Represents a Three.js mesh object."""
    type: str  # "sphere", "box", "line", etc.
    position: Dict[str, float]
    scale: Dict[str, float]
    color: Dict[str, float]
    opacity: float
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "position": self.position,
            "scale": self.scale,
            "color": self.color,
            "opacity": self.opacity,
            "metadata": self.metadata,
        }


class ThreeJSExporter:
    """
    Exports spatial analysis results to Three.js-compatible format.

    Generates:
    - Cluster visualization meshes (spheres with size based on cluster size)
    - Hotspot indicators (pulsing spheres for high-density areas)
    - Density heatmap (colored grid cells)
    - Zone utilization overlays
    - Connection lines between related clusters

    Example:
        exporter = ThreeJSExporter()

        result = analyzer.analyze(items)
        threejs_data = exporter.export(result)

        # Send to frontend via WebSocket or REST API
        websocket.send(json.dumps(threejs_data))
    """

    def __init__(
        self,
        cluster_base_radius: float = 2.0,
        hotspot_scale_factor: float = 1.5,
        heatmap_cell_size: float = 5.0,
        opacity_base: float = 0.6,
    ):
        """
        Initialize exporter.

        Args:
            cluster_base_radius: Base radius for cluster spheres
            hotspot_scale_factor: Scale factor for hotspot indicators
            heatmap_cell_size: Size of heatmap grid cells
            opacity_base: Base opacity for visualization elements
        """
        self.cluster_base_radius = cluster_base_radius
        self.hotspot_scale_factor = hotspot_scale_factor
        self.heatmap_cell_size = heatmap_cell_size
        self.opacity_base = opacity_base
        self.logger = logging.getLogger(__name__)

    def export(
        self,
        result: "SpatialAnalysisResult",
    ) -> Dict[str, Any]:
        """
        Export complete analysis result for Three.js.

        Returns JSON-serializable dictionary with all visualization data.
        """
        return {
            "timestamp": result.timestamp.isoformat(),
            "summary": {
                "totalItems": result.total_items,
                "totalClusters": len(result.clusters),
                "hotspotCount": len(result.hotspots),
                "overcrowdedZones": result.overcrowded_zones,
                "processingTimeMs": result.processing_time_ms,
            },
            "clusters": self.export_clusters(result.clusters),
            "hotspots": self.export_hotspots(result.hotspots),
            "zoneDensities": self.export_zone_densities(result.zone_densities),
            "suggestions": result.optimization_suggestions,
            "visualization": {
                "colorSchemes": {
                    "zones": ZONE_COLORS,
                    "severity": SEVERITY_COLORS,
                    "heatmapGradient": HEATMAP_GRADIENT,
                },
            },
        }

    def export_clusters(
        self,
        clusters: List["Cluster"],
    ) -> List[Dict[str, Any]]:
        """Export clusters as Three.js sphere meshes."""
        meshes = []

        for cluster in clusters:
            # Scale radius based on cluster size
            radius = self.cluster_base_radius + np.log1p(cluster.size) * 0.5

            # Color based on density
            color = self._density_to_color(cluster.density)

            # Opacity based on size
            opacity = min(0.9, self.opacity_base + cluster.size * 0.01)

            mesh = ThreeJSMesh(
                type="sphere",
                position={
                    "x": float(cluster.centroid[0]),
                    "y": float(cluster.centroid[1]),
                    "z": float(cluster.centroid[2]),
                },
                scale={
                    "x": radius,
                    "y": radius,
                    "z": radius,
                },
                color=color,
                opacity=opacity,
                metadata={
                    "clusterId": cluster.cluster_id,
                    "size": cluster.size,
                    "density": cluster.density,
                    "radius": cluster.radius,
                    "itemIds": cluster.item_ids[:10],  # Limit for performance
                    "zoneDistribution": cluster.zone_distribution,
                },
            )

            meshes.append(mesh.to_dict())

        return meshes

    def export_hotspots(
        self,
        hotspots: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Export hotspots with pulsing animation data."""
        exported = []

        for hotspot in hotspots:
            severity = hotspot.get("severity", "low")
            color = SEVERITY_COLORS.get(severity, SEVERITY_COLORS["low"])

            # Scale based on item count
            base_scale = 3.0 + np.log1p(hotspot.get("itemCount", 1)) * 0.5
            scale = base_scale * self.hotspot_scale_factor

            exported.append({
                "type": "hotspot",
                "position": hotspot.get("center", {"x": 0, "y": 0, "z": 0}),
                "scale": {"x": scale, "y": scale, "z": scale},
                "color": color,
                "severity": severity,
                "animation": {
                    "type": "pulse",
                    "frequency": self._severity_to_frequency(severity),
                    "amplitude": 0.2,
                },
                "metadata": {
                    "clusterId": hotspot.get("clusterId"),
                    "itemCount": hotspot.get("itemCount"),
                    "radius": hotspot.get("radius"),
                    "density": hotspot.get("density"),
                },
            })

        return exported

    def export_zone_densities(
        self,
        densities: List["ZoneDensity"],
    ) -> List[Dict[str, Any]]:
        """Export zone densities with utilization coloring."""
        exported = []

        for density in densities:
            # Color based on utilization
            color = self._utilization_to_color(density.utilization)

            exported.append({
                "zoneId": density.zone_id,
                "zoneName": density.zone_name,
                "color": color,
                "utilization": density.utilization,
                "itemCount": density.item_count,
                "capacity": density.capacity,
                "isOvercrowded": density.is_overcrowded,
                "priority": density.priority,
                "overlay": {
                    "type": "zone_fill",
                    "opacity": min(0.8, density.utilization * 0.6 + 0.2),
                },
            })

        return exported

    def export_heatmap(
        self,
        cells: List["DensityHeatmapCell"],
    ) -> Dict[str, Any]:
        """Export density heatmap as instanced mesh data."""
        if not cells:
            return {"cells": [], "metadata": {}}

        positions = []
        colors = []
        scales = []

        for cell in cells:
            positions.append({
                "x": cell.x,
                "y": cell.y,
                "z": cell.z,
            })

            colors.append(self._density_to_color(cell.density))

            # Scale height based on density
            height = 0.5 + cell.density * 4.0
            scales.append({
                "x": self.heatmap_cell_size * 0.9,
                "y": height,
                "z": self.heatmap_cell_size * 0.9,
            })

        return {
            "type": "instanced_mesh",
            "geometry": "box",
            "cells": [
                {
                    "position": positions[i],
                    "color": colors[i],
                    "scale": scales[i],
                    "itemCount": cells[i].item_count,
                    "density": cells[i].density,
                }
                for i in range(len(cells))
            ],
            "metadata": {
                "cellCount": len(cells),
                "cellSize": self.heatmap_cell_size,
                "maxDensity": max(c.density for c in cells) if cells else 0,
            },
        }

    def export_connections(
        self,
        clusters: List["Cluster"],
        max_connections: int = 10,
        max_distance: float = 50.0,
    ) -> List[Dict[str, Any]]:
        """
        Export connection lines between nearby clusters.

        Useful for visualizing cluster relationships and flow.
        """
        if len(clusters) < 2:
            return []

        connections = []
        processed = set()

        for i, c1 in enumerate(clusters):
            for j, c2 in enumerate(clusters[i + 1:], i + 1):
                if len(connections) >= max_connections:
                    break

                distance = np.linalg.norm(c1.centroid - c2.centroid)

                if distance > max_distance:
                    continue

                key = tuple(sorted([c1.cluster_id, c2.cluster_id]))
                if key in processed:
                    continue
                processed.add(key)

                # Color based on distance (closer = more opaque)
                opacity = 1.0 - (distance / max_distance)

                connections.append({
                    "type": "line",
                    "from": {
                        "x": float(c1.centroid[0]),
                        "y": float(c1.centroid[1]),
                        "z": float(c1.centroid[2]),
                    },
                    "to": {
                        "x": float(c2.centroid[0]),
                        "y": float(c2.centroid[1]),
                        "z": float(c2.centroid[2]),
                    },
                    "color": {"r": 0.5, "g": 0.5, "b": 0.5},
                    "opacity": opacity * 0.5,
                    "lineWidth": 1.0,
                    "metadata": {
                        "fromCluster": c1.cluster_id,
                        "toCluster": c2.cluster_id,
                        "distance": float(distance),
                    },
                })

        return connections

    def _density_to_color(self, density: float) -> Dict[str, float]:
        """Convert density value (0-1) to color using gradient."""
        # Clamp density to 0-1
        density = max(0.0, min(1.0, density))

        # Find gradient stops
        for i in range(len(HEATMAP_GRADIENT) - 1):
            stop1 = HEATMAP_GRADIENT[i]
            stop2 = HEATMAP_GRADIENT[i + 1]

            if stop1["stop"] <= density <= stop2["stop"]:
                # Interpolate between stops
                t = (density - stop1["stop"]) / (stop2["stop"] - stop1["stop"])
                return {
                    "r": stop1["color"]["r"] + t * (stop2["color"]["r"] - stop1["color"]["r"]),
                    "g": stop1["color"]["g"] + t * (stop2["color"]["g"] - stop1["color"]["g"]),
                    "b": stop1["color"]["b"] + t * (stop2["color"]["b"] - stop1["color"]["b"]),
                }

        # Default to last color
        return HEATMAP_GRADIENT[-1]["color"].copy()

    def _utilization_to_color(self, utilization: float) -> Dict[str, float]:
        """Convert utilization (0-1) to color."""
        if utilization >= 0.95:
            return SEVERITY_COLORS["critical"].copy()
        elif utilization >= 0.85:
            return SEVERITY_COLORS["high"].copy()
        elif utilization >= 0.7:
            return SEVERITY_COLORS["medium"].copy()
        else:
            return SEVERITY_COLORS["low"].copy()

    def _severity_to_frequency(self, severity: str) -> float:
        """Convert severity to animation frequency."""
        frequencies = {
            "critical": 3.0,  # Fast pulsing
            "high": 2.0,
            "medium": 1.0,
            "low": 0.5,      # Slow pulsing
        }
        return frequencies.get(severity, 1.0)

    def to_json(
        self,
        result: "SpatialAnalysisResult",
        pretty: bool = False,
    ) -> str:
        """Export to JSON string."""
        data = self.export(result)
        if pretty:
            return json.dumps(data, indent=2)
        return json.dumps(data)
