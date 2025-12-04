"""
RFID Spatial Analytics Engine

Advanced 3D spatial analysis using Open3D for:
- Item clustering and hotspot detection
- Zone density and overcrowding analysis
- Spatial optimization recommendations
- Three.js visualization export

Phase 5: Open3D Integration
"""

from .spatial_analyzer import SpatialAnalyzer
from .clustering import ClusteringEngine
from .density import DensityAnalyzer
from .exporter import ThreeJSExporter

__version__ = "1.0.0"
__all__ = ["SpatialAnalyzer", "ClusteringEngine", "DensityAnalyzer", "ThreeJSExporter"]
