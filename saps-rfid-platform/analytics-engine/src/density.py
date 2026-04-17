"""
Density Analyzer - Zone density and overcrowding detection

Analyzes item distribution across warehouse zones,
detects overcrowding, and calculates utilization metrics.
"""

import numpy as np
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from dataclasses import dataclass
import logging

if TYPE_CHECKING:
    from .spatial_analyzer import ItemPosition, ZoneConfig


@dataclass
class ZoneDensity:
    """Density metrics for a single zone."""
    zone_id: str
    zone_name: str
    item_count: int
    capacity: int
    utilization: float  # 0-1 ratio
    density: float  # items per unit volume
    is_overcrowded: bool
    priority: str
    items_to_relocate: int  # suggested items to move if overcrowded

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "zoneId": self.zone_id,
            "zoneName": self.zone_name,
            "itemCount": self.item_count,
            "capacity": self.capacity,
            "utilization": round(self.utilization, 3),
            "density": round(self.density, 4),
            "isOvercrowded": self.is_overcrowded,
            "priority": self.priority,
            "itemsToRelocate": self.items_to_relocate,
        }


@dataclass
class DensityHeatmapCell:
    """Single cell in density heatmap grid."""
    x: float
    y: float
    z: float
    density: float
    item_count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "position": {"x": self.x, "y": self.y, "z": self.z},
            "density": round(self.density, 4),
            "itemCount": self.item_count,
        }


class DensityAnalyzer:
    """
    Analyzes zone density and detects overcrowding.

    Provides:
    - Zone utilization metrics
    - Overcrowding detection with configurable thresholds
    - 3D density heatmap generation for visualization
    - Relocation recommendations

    Example:
        analyzer = DensityAnalyzer(overcrowding_threshold=0.85)

        items = [...]  # List of ItemPosition
        zones = {...}  # Dict of zone_id -> ZoneConfig

        densities = analyzer.analyze_zones(items, zones)

        # Generate heatmap for visualization
        heatmap = analyzer.generate_heatmap(items, grid_size=5.0)
    """

    def __init__(
        self,
        overcrowding_threshold: float = 0.85,
        critical_threshold: float = 0.95,
        target_utilization: float = 0.70,
    ):
        """
        Initialize density analyzer.

        Args:
            overcrowding_threshold: Utilization level to trigger overcrowding alert (0-1)
            critical_threshold: Utilization level for critical alert (0-1)
            target_utilization: Ideal utilization level for redistribution (0-1)
        """
        self.overcrowding_threshold = overcrowding_threshold
        self.critical_threshold = critical_threshold
        self.target_utilization = target_utilization
        self.logger = logging.getLogger(__name__)

    def analyze_zones(
        self,
        items: List["ItemPosition"],
        zones: Dict[str, "ZoneConfig"],
    ) -> List[ZoneDensity]:
        """
        Analyze density for all zones.

        Args:
            items: List of item positions
            zones: Dictionary of zone configurations

        Returns:
            List of ZoneDensity objects for each zone
        """
        # Count items per zone
        zone_counts: Dict[str, int] = {}
        for item in items:
            zone_counts[item.zone_id] = zone_counts.get(item.zone_id, 0) + 1

        densities = []

        for zone_id, zone in zones.items():
            item_count = zone_counts.get(zone_id, 0)
            capacity = zone.capacity
            volume = zone.volume

            # Calculate metrics
            utilization = item_count / capacity if capacity > 0 else 0
            density = item_count / volume if volume > 0 else 0
            is_overcrowded = utilization >= self.overcrowding_threshold

            # Calculate suggested relocations
            items_to_relocate = 0
            if is_overcrowded:
                target_count = int(capacity * self.target_utilization)
                items_to_relocate = max(0, item_count - target_count)

            densities.append(ZoneDensity(
                zone_id=zone_id,
                zone_name=zone.name,
                item_count=item_count,
                capacity=capacity,
                utilization=utilization,
                density=density,
                is_overcrowded=is_overcrowded,
                priority=zone.priority,
                items_to_relocate=items_to_relocate,
            ))

        # Sort by utilization (highest first)
        densities.sort(key=lambda d: d.utilization, reverse=True)

        # Log summary
        overcrowded_count = sum(1 for d in densities if d.is_overcrowded)
        if overcrowded_count > 0:
            self.logger.warning(
                f"Overcrowding detected in {overcrowded_count} zones"
            )

        return densities

    def generate_heatmap(
        self,
        items: List["ItemPosition"],
        grid_size: float = 5.0,
        bounds: Optional[Dict[str, float]] = None,
    ) -> List[DensityHeatmapCell]:
        """
        Generate 3D density heatmap for visualization.

        Divides the space into a grid and calculates density per cell.

        Args:
            items: List of item positions
            grid_size: Size of each grid cell in units
            bounds: Optional bounds {minX, maxX, minY, maxY, minZ, maxZ}

        Returns:
            List of heatmap cells with density values
        """
        if not items:
            return []

        # Get bounds from items if not provided
        if bounds is None:
            points = np.array([[i.x, i.y, i.z] for i in items])
            bounds = {
                "minX": float(np.min(points[:, 0])) - grid_size,
                "maxX": float(np.max(points[:, 0])) + grid_size,
                "minY": float(np.min(points[:, 1])) - grid_size,
                "maxY": float(np.max(points[:, 1])) + grid_size,
                "minZ": float(np.min(points[:, 2])) - grid_size,
                "maxZ": float(np.max(points[:, 2])) + grid_size,
            }

        # Create grid
        x_bins = np.arange(bounds["minX"], bounds["maxX"], grid_size)
        y_bins = np.arange(bounds["minY"], bounds["maxY"], grid_size)
        z_bins = np.arange(bounds["minZ"], bounds["maxZ"], grid_size)

        # Count items in each cell
        cell_counts: Dict[tuple, int] = {}
        for item in items:
            x_idx = int((item.x - bounds["minX"]) / grid_size)
            y_idx = int((item.y - bounds["minY"]) / grid_size)
            z_idx = int((item.z - bounds["minZ"]) / grid_size)
            key = (x_idx, y_idx, z_idx)
            cell_counts[key] = cell_counts.get(key, 0) + 1

        # Calculate volume per cell
        cell_volume = grid_size ** 3

        # Generate heatmap cells
        heatmap = []
        max_count = max(cell_counts.values()) if cell_counts else 1

        for (x_idx, y_idx, z_idx), count in cell_counts.items():
            if count == 0:
                continue

            # Calculate cell center
            x = bounds["minX"] + (x_idx + 0.5) * grid_size
            y = bounds["minY"] + (y_idx + 0.5) * grid_size
            z = bounds["minZ"] + (z_idx + 0.5) * grid_size

            # Normalized density (0-1)
            density = count / max_count

            heatmap.append(DensityHeatmapCell(
                x=x,
                y=y,
                z=z,
                density=density,
                item_count=count,
            ))

        # Sort by density (highest first)
        heatmap.sort(key=lambda c: c.density, reverse=True)

        self.logger.debug(
            f"Generated heatmap with {len(heatmap)} cells "
            f"(grid_size={grid_size})"
        )

        return heatmap

    def get_zone_balance_score(
        self,
        densities: List[ZoneDensity],
    ) -> Dict[str, Any]:
        """
        Calculate overall zone balance score.

        A score of 1.0 means perfect balance (all zones at same utilization).
        Lower scores indicate imbalance.

        Returns:
            Dictionary with balance metrics
        """
        if not densities:
            return {
                "balanceScore": 1.0,
                "averageUtilization": 0,
                "utilizationStdDev": 0,
                "imbalanceRatio": 0,
            }

        utilizations = [d.utilization for d in densities]
        avg_util = np.mean(utilizations)
        std_util = np.std(utilizations)
        max_util = max(utilizations)
        min_util = min(utilizations)

        # Balance score: 1 - coefficient of variation
        cv = std_util / avg_util if avg_util > 0 else 0
        balance_score = max(0, 1 - cv)

        # Imbalance ratio: difference between max and min
        imbalance_ratio = max_util - min_util

        return {
            "balanceScore": round(balance_score, 3),
            "averageUtilization": round(avg_util, 3),
            "utilizationStdDev": round(std_util, 3),
            "imbalanceRatio": round(imbalance_ratio, 3),
            "maxUtilization": round(max_util, 3),
            "minUtilization": round(min_util, 3),
        }

    def get_redistribution_plan(
        self,
        densities: List[ZoneDensity],
    ) -> List[Dict[str, Any]]:
        """
        Generate a redistribution plan for overcrowded zones.

        Returns list of suggested moves to balance zones.
        """
        overcrowded = [d for d in densities if d.is_overcrowded]
        underutilized = [
            d for d in densities
            if d.utilization < self.target_utilization
        ]

        if not overcrowded or not underutilized:
            return []

        plan = []

        for source in overcrowded:
            items_needed = source.items_to_relocate

            for target in underutilized:
                if items_needed <= 0:
                    break

                # Calculate available capacity in target
                available = int(
                    target.capacity * self.target_utilization
                ) - target.item_count

                if available <= 0:
                    continue

                # Move items
                move_count = min(items_needed, available)
                items_needed -= move_count

                plan.append({
                    "fromZone": source.zone_id,
                    "toZone": target.zone_id,
                    "itemCount": move_count,
                    "reason": f"Balance utilization from {source.utilization:.0%} to target {self.target_utilization:.0%}",
                    "priority": "high" if source.utilization >= self.critical_threshold else "medium",
                })

        return plan

    def get_density_statistics(
        self,
        densities: List[ZoneDensity],
    ) -> Dict[str, Any]:
        """Get summary statistics for zone densities."""
        if not densities:
            return {
                "totalZones": 0,
                "totalItems": 0,
                "totalCapacity": 0,
                "overallUtilization": 0,
                "overcrowdedZones": 0,
                "underutilizedZones": 0,
            }

        total_items = sum(d.item_count for d in densities)
        total_capacity = sum(d.capacity for d in densities)
        overcrowded = sum(1 for d in densities if d.is_overcrowded)
        underutilized = sum(
            1 for d in densities
            if d.utilization < 0.2 and d.item_count > 0
        )

        return {
            "totalZones": len(densities),
            "totalItems": total_items,
            "totalCapacity": total_capacity,
            "overallUtilization": round(
                total_items / total_capacity if total_capacity > 0 else 0, 3
            ),
            "overcrowdedZones": overcrowded,
            "underutilizedZones": underutilized,
            "balanceMetrics": self.get_zone_balance_score(densities),
        }
