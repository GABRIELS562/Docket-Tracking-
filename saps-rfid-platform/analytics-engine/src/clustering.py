"""
Clustering Engine - DBSCAN-based spatial clustering

Identifies item hotspots and clusters using density-based
spatial clustering (DBSCAN algorithm).
"""

import numpy as np
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from dataclasses import dataclass
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import logging

if TYPE_CHECKING:
    from .spatial_analyzer import ItemPosition


@dataclass
class Cluster:
    """Represents a spatial cluster of items."""
    cluster_id: int
    centroid: np.ndarray  # [x, y, z]
    size: int
    radius: float
    density: float  # items per unit volume
    item_ids: List[str]
    zone_distribution: Dict[str, int]  # zone_id -> count

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "clusterId": self.cluster_id,
            "centroid": {
                "x": float(self.centroid[0]),
                "y": float(self.centroid[1]),
                "z": float(self.centroid[2]),
            },
            "size": self.size,
            "radius": float(self.radius),
            "density": float(self.density),
            "itemIds": self.item_ids,
            "zoneDistribution": self.zone_distribution,
        }


class ClusteringEngine:
    """
    DBSCAN-based clustering engine for item hotspot detection.

    DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
    is ideal for spatial data because:
    - Finds arbitrarily shaped clusters
    - Doesn't require specifying number of clusters
    - Identifies noise/outliers
    - Works well with varying density

    Example:
        engine = ClusteringEngine(eps=5.0, min_samples=3)

        points = np.array([[1, 2, 3], [1.5, 2.5, 3.5], [10, 10, 10]])
        items = [...]  # ItemPosition objects

        clusters = engine.find_clusters(points, items)
    """

    def __init__(
        self,
        eps: float = 5.0,
        min_samples: int = 3,
        use_scaling: bool = False,
    ):
        """
        Initialize clustering engine.

        Args:
            eps: Maximum distance between two samples to be in same neighborhood
            min_samples: Minimum samples in a neighborhood to form a core point
            use_scaling: Whether to normalize coordinates before clustering
        """
        self.eps = eps
        self.min_samples = min_samples
        self.use_scaling = use_scaling
        self.scaler = StandardScaler() if use_scaling else None
        self.logger = logging.getLogger(__name__)

    def find_clusters(
        self,
        points: np.ndarray,
        items: List["ItemPosition"],
    ) -> List[Cluster]:
        """
        Find clusters in the point cloud.

        Args:
            points: Nx3 array of [x, y, z] coordinates
            items: Corresponding ItemPosition objects

        Returns:
            List of Cluster objects
        """
        if len(points) < self.min_samples:
            self.logger.debug(f"Not enough points for clustering: {len(points)}")
            return []

        # Optionally scale coordinates
        if self.use_scaling and self.scaler:
            points_scaled = self.scaler.fit_transform(points)
        else:
            points_scaled = points

        # Run DBSCAN
        dbscan = DBSCAN(
            eps=self.eps,
            min_samples=self.min_samples,
            metric="euclidean",
            n_jobs=-1,  # Use all CPU cores
        )

        labels = dbscan.fit_predict(points_scaled)

        # Build clusters
        clusters = self._build_clusters(points, items, labels)

        self.logger.info(
            f"Found {len(clusters)} clusters from {len(points)} points "
            f"(noise points: {np.sum(labels == -1)})"
        )

        return clusters

    def _build_clusters(
        self,
        points: np.ndarray,
        items: List["ItemPosition"],
        labels: np.ndarray,
    ) -> List[Cluster]:
        """Build Cluster objects from DBSCAN labels."""
        clusters = []
        unique_labels = set(labels)

        for label in unique_labels:
            if label == -1:
                # Skip noise points
                continue

            # Get points in this cluster
            mask = labels == label
            cluster_points = points[mask]
            cluster_items = [items[i] for i in range(len(items)) if mask[i]]

            # Calculate cluster properties
            centroid = np.mean(cluster_points, axis=0)
            size = len(cluster_points)

            # Calculate radius (max distance from centroid)
            distances = np.linalg.norm(cluster_points - centroid, axis=1)
            radius = float(np.max(distances)) if len(distances) > 0 else 0.0

            # Calculate density (items per unit volume)
            # Using spherical approximation
            volume = (4/3) * np.pi * (radius ** 3) if radius > 0 else 1.0
            density = size / volume

            # Zone distribution
            zone_distribution: Dict[str, int] = {}
            for item in cluster_items:
                zone_distribution[item.zone_id] = zone_distribution.get(item.zone_id, 0) + 1

            # Item IDs
            item_ids = [item.item_id for item in cluster_items]

            clusters.append(Cluster(
                cluster_id=label,
                centroid=centroid,
                size=size,
                radius=radius,
                density=density,
                item_ids=item_ids,
                zone_distribution=zone_distribution,
            ))

        # Sort by size (largest first)
        clusters.sort(key=lambda c: c.size, reverse=True)

        return clusters

    def find_nearest_cluster(
        self,
        point: np.ndarray,
        clusters: List[Cluster],
    ) -> Optional[Cluster]:
        """Find the nearest cluster to a given point."""
        if not clusters:
            return None

        min_distance = float("inf")
        nearest = None

        for cluster in clusters:
            distance = np.linalg.norm(point - cluster.centroid)
            if distance < min_distance:
                min_distance = distance
                nearest = cluster

        return nearest

    def calculate_cluster_separation(self, clusters: List[Cluster]) -> float:
        """
        Calculate average separation between cluster centroids.

        Higher separation indicates better-distributed inventory.
        """
        if len(clusters) < 2:
            return 0.0

        total_distance = 0.0
        count = 0

        for i, c1 in enumerate(clusters):
            for c2 in clusters[i + 1:]:
                distance = np.linalg.norm(c1.centroid - c2.centroid)
                total_distance += distance
                count += 1

        return total_distance / count if count > 0 else 0.0

    def get_cluster_statistics(self, clusters: List[Cluster]) -> Dict[str, Any]:
        """Get summary statistics for clusters."""
        if not clusters:
            return {
                "totalClusters": 0,
                "totalClusteredItems": 0,
                "averageClusterSize": 0,
                "maxClusterSize": 0,
                "averageRadius": 0,
                "averageDensity": 0,
                "clusterSeparation": 0,
            }

        sizes = [c.size for c in clusters]
        radii = [c.radius for c in clusters]
        densities = [c.density for c in clusters]

        return {
            "totalClusters": len(clusters),
            "totalClusteredItems": sum(sizes),
            "averageClusterSize": np.mean(sizes),
            "maxClusterSize": max(sizes),
            "averageRadius": np.mean(radii),
            "averageDensity": np.mean(densities),
            "clusterSeparation": self.calculate_cluster_separation(clusters),
        }
