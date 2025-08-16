/**
 * RFID Triangulation and Location Algorithm
 * Implements precise location tracking using multiple RFID readers
 */

import { logger } from '../../utils/logger';

export interface Position3D {
  x: number;
  y: number;
  z: number;
  accuracy: number; // meters
  confidence: number; // 0-1
}

export interface ReaderMeasurement {
  reader_id: string;
  reader_position: Position3D;
  rssi: number; // dBm
  phase: number; // radians
  timestamp: number;
  antenna_gain: number; // dBi
  frequency: number; // MHz
}

export interface TagLocation {
  tag_id: string;
  position: Position3D;
  velocity?: { vx: number; vy: number; vz: number };
  measurements: ReaderMeasurement[];
  algorithm: 'trilateration' | 'fingerprinting' | 'kalman' | 'ml';
  timestamp: number;
}

export class RfidTriangulation {
  // Path loss exponent for indoor environment
  private readonly PATH_LOSS_EXPONENT = 2.7;
  
  // Reference RSSI at 1 meter distance
  private readonly REFERENCE_RSSI = -30; // dBm
  
  // Kalman filter state for each tag
  private kalmanStates: Map<string, KalmanState> = new Map();
  
  // Fingerprint database for location matching
  private fingerprintDB: Map<string, RssiFingerprint[]> = new Map();

  /**
   * Calculate precise position using multiple algorithms
   */
  calculatePosition(tagId: string, measurements: ReaderMeasurement[]): TagLocation {
    if (measurements.length === 0) {
      throw new Error('No measurements available');
    }

    // Sort by timestamp, use only recent measurements (last 500ms)
    const now = Date.now();
    const recentMeasurements = measurements
      .filter(m => now - m.timestamp < 500)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentMeasurements.length === 0) {
      throw new Error('No recent measurements available');
    }

    let position: Position3D;
    let algorithm: TagLocation['algorithm'];

    // Choose algorithm based on available data
    if (recentMeasurements.length >= 4) {
      // Use trilateration with 4+ readers
      position = this.trilateration(recentMeasurements);
      algorithm = 'trilateration';
    } else if (this.fingerprintDB.size > 0) {
      // Use fingerprinting if database available
      position = this.fingerprinting(recentMeasurements);
      algorithm = 'fingerprinting';
    } else if (recentMeasurements.length >= 3) {
      // Use weighted centroid for 3 readers
      position = this.weightedCentroid(recentMeasurements);
      algorithm = 'trilateration';
    } else {
      // Fallback to proximity-based estimation
      position = this.proximityEstimation(recentMeasurements);
      algorithm = 'trilateration';
    }

    // Apply Kalman filter for smoothing
    if (this.kalmanStates.has(tagId)) {
      position = this.applyKalmanFilter(tagId, position);
      algorithm = 'kalman';
    } else {
      this.initializeKalmanFilter(tagId, position);
    }

    // Calculate velocity if we have history
    const velocity = this.calculateVelocity(tagId, position);

    return {
      tag_id: tagId,
      position,
      velocity,
      measurements: recentMeasurements,
      algorithm,
      timestamp: now
    };
  }

  /**
   * Trilateration using least squares optimization
   */
  private trilateration(measurements: ReaderMeasurement[]): Position3D {
    // Convert RSSI to distances
    const spheres = measurements.map(m => ({
      center: m.reader_position,
      radius: this.rssiToDistance(m.rssi, m.frequency)
    }));

    // Set up least squares problem: Ax = b
    const n = spheres.length;
    const A: number[][] = [];
    const b: number[] = [];

    // Use first sphere as reference
    const ref = spheres[0];

    for (let i = 1; i < n; i++) {
      const s = spheres[i];
      
      A.push([
        2 * (s.center.x - ref.center.x),
        2 * (s.center.y - ref.center.y),
        2 * (s.center.z - ref.center.z)
      ]);

      b.push(
        Math.pow(ref.radius, 2) - Math.pow(s.radius, 2) +
        Math.pow(s.center.x, 2) - Math.pow(ref.center.x, 2) +
        Math.pow(s.center.y, 2) - Math.pow(ref.center.y, 2) +
        Math.pow(s.center.z, 2) - Math.pow(ref.center.z, 2)
      );
    }

    // Solve using least squares (A^T * A * x = A^T * b)
    const position = this.solveLeastSquares(A, b);
    
    // Calculate accuracy based on residuals
    const accuracy = this.calculateAccuracy(position, spheres);
    const confidence = Math.min(1, Math.max(0, 1 - accuracy / 10));

    return {
      x: position[0] + ref.center.x,
      y: position[1] + ref.center.y,
      z: position[2] + ref.center.z,
      accuracy,
      confidence
    };
  }

  /**
   * Weighted centroid based on RSSI values
   */
  private weightedCentroid(measurements: ReaderMeasurement[]): Position3D {
    let weightedX = 0, weightedY = 0, weightedZ = 0;
    let totalWeight = 0;

    measurements.forEach(m => {
      const distance = this.rssiToDistance(m.rssi, m.frequency);
      const weight = 1 / Math.pow(distance, 2);

      weightedX += m.reader_position.x * weight;
      weightedY += m.reader_position.y * weight;
      weightedZ += m.reader_position.z * weight;
      totalWeight += weight;
    });

    const accuracy = this.estimateAccuracy(measurements);

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
      z: weightedZ / totalWeight,
      accuracy,
      confidence: Math.min(1, measurements.length / 4)
    };
  }

  /**
   * Fingerprinting-based location
   */
  private fingerprinting(measurements: ReaderMeasurement[]): Position3D {
    let bestMatch: RssiFingerprint | null = null;
    let minDistance = Infinity;

    // Create RSSI vector from measurements
    const rssiVector = new Map<string, number>();
    measurements.forEach(m => {
      rssiVector.set(m.reader_id, m.rssi);
    });

    // Find best matching fingerprint
    this.fingerprintDB.forEach(fingerprints => {
      fingerprints.forEach(fp => {
        const distance = this.calculateFingerprintDistance(rssiVector, fp.rssiMap);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = fp;
        }
      });
    });

    if (!bestMatch) {
      // Fallback to weighted centroid
      return this.weightedCentroid(measurements);
    }

    return {
      x: bestMatch.position.x,
      y: bestMatch.position.y,
      z: bestMatch.position.z,
      accuracy: minDistance / 10, // Convert distance to meters
      confidence: Math.max(0, 1 - minDistance / 50)
    };
  }

  /**
   * Simple proximity estimation for single reader
   */
  private proximityEstimation(measurements: ReaderMeasurement[]): Position3D {
    const m = measurements[0];
    const distance = this.rssiToDistance(m.rssi, m.frequency);

    // Place tag at estimated distance from reader
    const angle = Math.random() * Math.PI * 2; // Unknown direction
    
    return {
      x: m.reader_position.x + distance * Math.cos(angle),
      y: m.reader_position.y + distance * Math.sin(angle),
      z: m.reader_position.z,
      accuracy: distance, // High uncertainty
      confidence: 0.3
    };
  }

  /**
   * Convert RSSI to distance using path loss model
   */
  private rssiToDistance(rssi: number, frequency: number = 915): number {
    // Friis path loss equation with environmental factors
    const wavelength = 300 / frequency; // meters
    const pathLoss = this.REFERENCE_RSSI - rssi;
    
    // Distance = 10^((Path Loss - 20*log10(4π/λ)) / (10*n))
    const distance = Math.pow(10, 
      (pathLoss - 20 * Math.log10(4 * Math.PI / wavelength)) / 
      (10 * this.PATH_LOSS_EXPONENT)
    );

    // Apply bounds (0.1m to 100m)
    return Math.max(0.1, Math.min(100, distance));
  }

  /**
   * Solve least squares problem
   */
  private solveLeastSquares(A: number[][], b: number[]): number[] {
    // Simple implementation using normal equations
    // In production, use a proper linear algebra library
    
    const n = A[0].length; // Number of unknowns
    const m = A.length; // Number of equations

    // Calculate A^T * A
    const AtA: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < m; k++) {
          AtA[i][j] += A[k][i] * A[k][j];
        }
      }
    }

    // Calculate A^T * b
    const Atb: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < m; k++) {
        Atb[i] += A[k][i] * b[k];
      }
    }

    // Solve AtA * x = Atb using Gaussian elimination
    return this.gaussianElimination(AtA, Atb);
  }

  /**
   * Gaussian elimination solver
   */
  private gaussianElimination(A: number[][], b: number[]): number[] {
    const n = b.length;
    const aug: number[][] = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Partial pivoting
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      // Make diagonal 1
      const divisor = aug[i][i];
      if (Math.abs(divisor) < 1e-10) continue;
      
      for (let j = i; j <= n; j++) {
        aug[i][j] /= divisor;
      }

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }

    // Back substitution
    const x: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
    }

    return x;
  }

  /**
   * Calculate position accuracy based on residuals
   */
  private calculateAccuracy(position: number[], spheres: any[]): number {
    let sumSquaredError = 0;

    spheres.forEach(s => {
      const distance = Math.sqrt(
        Math.pow(position[0] - s.center.x, 2) +
        Math.pow(position[1] - s.center.y, 2) +
        Math.pow(position[2] - s.center.z, 2)
      );
      const error = Math.abs(distance - s.radius);
      sumSquaredError += error * error;
    });

    return Math.sqrt(sumSquaredError / spheres.length);
  }

  /**
   * Estimate accuracy based on RSSI variance
   */
  private estimateAccuracy(measurements: ReaderMeasurement[]): number {
    if (measurements.length === 1) {
      return 5.0; // Single reader: 5m accuracy
    }

    // Calculate RSSI variance
    const rssiValues = measurements.map(m => m.rssi);
    const mean = rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
    const variance = rssiValues.reduce((sum, rssi) => sum + Math.pow(rssi - mean, 2), 0) / rssiValues.length;

    // Higher variance = lower accuracy
    return Math.max(0.5, Math.min(10, variance / 10));
  }

  /**
   * Initialize Kalman filter for a tag
   */
  private initializeKalmanFilter(tagId: string, initialPosition: Position3D): void {
    this.kalmanStates.set(tagId, {
      x: [initialPosition.x, initialPosition.y, initialPosition.z, 0, 0, 0], // pos + vel
      P: this.createIdentityMatrix(6, 100), // Initial covariance
      timestamp: Date.now()
    });
  }

  /**
   * Apply Kalman filter for position smoothing
   */
  private applyKalmanFilter(tagId: string, measurement: Position3D): Position3D {
    const state = this.kalmanStates.get(tagId)!;
    const dt = (Date.now() - state.timestamp) / 1000; // seconds

    // Prediction step
    const F = this.createStateTransitionMatrix(dt);
    const Q = this.createProcessNoiseMatrix(dt);
    
    const x_pred = this.matrixMultiplyVector(F, state.x);
    const P_pred = this.matrixAdd(
      this.matrixMultiply(this.matrixMultiply(F, state.P), this.matrixTranspose(F)),
      Q
    );

    // Update step
    const H = this.createMeasurementMatrix();
    const R = this.createMeasurementNoiseMatrix(measurement.accuracy);
    const z = [measurement.x, measurement.y, measurement.z];

    const y = this.vectorSubtract(z, this.matrixMultiplyVector(H, x_pred));
    const S = this.matrixAdd(
      this.matrixMultiply(this.matrixMultiply(H, P_pred), this.matrixTranspose(H)),
      R
    );
    const K = this.matrixMultiply(
      this.matrixMultiply(P_pred, this.matrixTranspose(H)),
      this.matrixInverse(S)
    );

    state.x = this.vectorAdd(x_pred, this.matrixMultiplyVector(K, y));
    state.P = this.matrixMultiply(
      this.matrixSubtract(this.createIdentityMatrix(6, 1), this.matrixMultiply(K, H)),
      P_pred
    );
    state.timestamp = Date.now();

    return {
      x: state.x[0],
      y: state.x[1],
      z: state.x[2],
      accuracy: measurement.accuracy * 0.7, // Improved by filtering
      confidence: Math.min(1, measurement.confidence * 1.2)
    };
  }

  /**
   * Calculate tag velocity from position history
   */
  private calculateVelocity(tagId: string, currentPosition: Position3D): { vx: number; vy: number; vz: number } | undefined {
    const state = this.kalmanStates.get(tagId);
    if (!state || !state.x[3]) return undefined;

    return {
      vx: state.x[3],
      vy: state.x[4],
      vz: state.x[5]
    };
  }

  /**
   * Calculate Euclidean distance between RSSI fingerprints
   */
  private calculateFingerprintDistance(measured: Map<string, number>, fingerprint: Map<string, number>): number {
    let sumSquared = 0;
    let count = 0;

    measured.forEach((rssi, readerId) => {
      const fpRssi = fingerprint.get(readerId);
      if (fpRssi !== undefined) {
        sumSquared += Math.pow(rssi - fpRssi, 2);
        count++;
      }
    });

    // Penalize missing readers
    const missingPenalty = Math.abs(measured.size - fingerprint.size) * 100;

    return count > 0 ? Math.sqrt(sumSquared / count) + missingPenalty : Infinity;
  }

  // Matrix operation helpers
  private createIdentityMatrix(size: number, scale: number = 1): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = [];
      for (let j = 0; j < size; j++) {
        matrix[i][j] = i === j ? scale : 0;
      }
    }
    return matrix;
  }

  private createStateTransitionMatrix(dt: number): number[][] {
    return [
      [1, 0, 0, dt, 0, 0],
      [0, 1, 0, 0, dt, 0],
      [0, 0, 1, 0, 0, dt],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1]
    ];
  }

  private createProcessNoiseMatrix(dt: number): number[][] {
    const q = 0.1; // Process noise intensity
    const dt2 = dt * dt;
    const dt3 = dt2 * dt;
    const dt4 = dt3 * dt;

    return [
      [dt4/4 * q, 0, 0, dt3/2 * q, 0, 0],
      [0, dt4/4 * q, 0, 0, dt3/2 * q, 0],
      [0, 0, dt4/4 * q, 0, 0, dt3/2 * q],
      [dt3/2 * q, 0, 0, dt2 * q, 0, 0],
      [0, dt3/2 * q, 0, 0, dt2 * q, 0],
      [0, 0, dt3/2 * q, 0, 0, dt2 * q]
    ];
  }

  private createMeasurementMatrix(): number[][] {
    return [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0]
    ];
  }

  private createMeasurementNoiseMatrix(accuracy: number): number[][] {
    const variance = accuracy * accuracy;
    return [
      [variance, 0, 0],
      [0, variance, 0],
      [0, 0, variance]
    ];
  }

  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        result[i][j] = 0;
        for (let k = 0; k < B.length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  private matrixMultiplyVector(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
  }

  private matrixTranspose(A: number[][]): number[][] {
    return A[0].map((_, i) => A.map(row => row[i]));
  }

  private matrixAdd(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }

  private matrixSubtract(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val - B[i][j]));
  }

  private matrixInverse(A: number[][]): number[][] {
    // Simple 3x3 matrix inverse for measurement updates
    // In production, use proper numerical library
    const n = A.length;
    const aug: number[][] = A.map((row, i) => [...row, ...this.createIdentityMatrix(n)[i]]);

    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
      // Pivoting
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

      // Scale row
      const divisor = aug[i][i];
      for (let j = 0; j < 2 * n; j++) {
        aug[i][j] /= divisor;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = 0; j < 2 * n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
    }

    // Extract inverse from augmented matrix
    return aug.map(row => row.slice(n));
  }

  private vectorAdd(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i]);
  }

  private vectorSubtract(a: number[], b: number[]): number[] {
    return a.map((val, i) => val - b[i]);
  }
}

interface KalmanState {
  x: number[]; // State vector [x, y, z, vx, vy, vz]
  P: number[][]; // Covariance matrix
  timestamp: number;
}

interface RssiFingerprint {
  position: Position3D;
  rssiMap: Map<string, number>;
  timestamp: number;
}