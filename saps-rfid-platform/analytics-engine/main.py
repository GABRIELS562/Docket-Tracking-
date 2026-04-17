#!/usr/bin/env python3
"""
RFID Spatial Analytics Engine - Entry Point

Starts the FastAPI server for spatial analysis.

Usage:
    python main.py [--host HOST] [--port PORT]

Environment Variables:
    ANALYTICS_HOST: Server host (default: 0.0.0.0)
    ANALYTICS_PORT: Server port (default: 8001)
    CORS_ORIGINS: Comma-separated CORS origins
    LOG_LEVEL: Logging level (default: INFO)
"""

import argparse
import logging
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def setup_logging(level: str = "INFO") -> None:
    """Configure logging."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ]
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="RFID Spatial Analytics Engine"
    )
    parser.add_argument(
        "--host",
        default=os.getenv("ANALYTICS_HOST", "0.0.0.0"),
        help="Server host (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("ANALYTICS_PORT", "8001")),
        help="Server port (default: 8001)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    parser.add_argument(
        "--log-level",
        default=os.getenv("LOG_LEVEL", "INFO"),
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level"
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    # Check Open3D availability
    try:
        import open3d as o3d
        logger.info(f"Open3D {o3d.__version__} loaded successfully")
    except ImportError:
        logger.warning(
            "Open3D not available. Some features will use fallback methods. "
            "Install with: pip install open3d"
        )

    # Log startup info
    logger.info(f"Starting RFID Spatial Analytics Engine")
    logger.info(f"Host: {args.host}")
    logger.info(f"Port: {args.port}")
    logger.info(f"Log Level: {args.log_level}")

    # Start server
    import uvicorn
    uvicorn.run(
        "src.api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level=args.log_level.lower(),
    )


if __name__ == "__main__":
    main()
