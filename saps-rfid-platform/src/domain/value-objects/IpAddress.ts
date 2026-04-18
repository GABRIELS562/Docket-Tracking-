import { ok, err } from 'neverthrow';

import { InvalidIpAddressError } from '../errors/InvalidIpAddressError';

import type { Result } from 'neverthrow';

/**
 * Value Object for IPv4 addresses
 *
 * Format: xxx.xxx.xxx.xxx
 * Example: 192.168.1.100
 *
 * @description
 * Immutable value object representing a validated IPv4 address.
 *
 * Validation Rules:
 * - Four octets separated by dots
 * - Each octet must be 0-255
 * - Standard IPv4 format
 *
 * @example
 * ```typescript
 * const result = IpAddress.create('192.168.1.100');
 * if (result.isOk()) {
 *   const ip = result.value;
 *   console.log(ip.getValue()); // "192.168.1.100"
 *   console.log(ip.isPrivate()); // true
 * }
 * ```
 */
export class IpAddress {
  private static readonly IPV4_PATTERN =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  /**
   * Private constructor ensures instances can only be created via factory method
   */
  private constructor(private readonly value: string) {}

  /**
   * Creates an IpAddress from a string value
   *
   * @param value - The IP address string to validate and create
   * @returns Result containing IpAddress or InvalidIpAddressError
   *
   * @example
   * ```typescript
   * const result = IpAddress.create('192.168.1.100');
   * ```
   */
  static create(value: string): Result<IpAddress, InvalidIpAddressError> {
    // Trim whitespace
    const trimmed = value.trim();

    // Check if empty
    if (trimmed.length === 0) {
      return err(new InvalidIpAddressError(value, 'IP address cannot be empty'));
    }

    // Validate format
    if (!IpAddress.IPV4_PATTERN.test(trimmed)) {
      return err(
        new InvalidIpAddressError(value, 'Must be a valid IPv4 address (e.g., 192.168.1.100)')
      );
    }

    // Additional validation: check each octet
    const octets = trimmed.split('.');
    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (num < 0 || num > 255) {
        return err(new InvalidIpAddressError(value, 'Each octet must be between 0 and 255'));
      }
    }

    return ok(new IpAddress(trimmed));
  }

  /**
   * Alias for create() - more semantic for parsing from strings
   */
  static fromString(value: string): Result<IpAddress, InvalidIpAddressError> {
    return IpAddress.create(value);
  }

  /**
   * Returns the raw IP address value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Returns the IP address as an array of octets
   *
   * @returns Array of 4 numbers representing each octet
   *
   * @example
   * ```typescript
   * const ip = IpAddress.create('192.168.1.100').unwrap();
   * console.log(ip.getOctets()); // [192, 168, 1, 100]
   * ```
   */
  getOctets(): [number, number, number, number] {
    const octets = this.value.split('.').map((octet) => parseInt(octet, 10));
    return octets as [number, number, number, number];
  }

  /**
   * Checks if this is a private IP address (RFC 1918)
   *
   * Private ranges:
   * - 10.0.0.0/8
   * - 172.16.0.0/12
   * - 192.168.0.0/16
   *
   * @returns true if the IP is in a private range
   */
  isPrivate(): boolean {
    const [first, second] = this.getOctets();

    // 10.0.0.0/8
    if (first === 10) {
      return true;
    }

    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }

    // 192.168.0.0/16
    if (first === 192 && second === 168) {
      return true;
    }

    return false;
  }

  /**
   * Checks if this is a loopback address (127.0.0.0/8)
   *
   * @returns true if the IP is a loopback address
   */
  isLoopback(): boolean {
    const [first] = this.getOctets();
    return first === 127;
  }

  /**
   * Converts the IP address to a 32-bit integer
   *
   * @returns The IP address as a number
   */
  toInteger(): number {
    const [a, b, c, d] = this.getOctets();
    return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
  }

  /**
   * Checks equality with another IpAddress
   *
   * @param other - The IpAddress to compare with
   * @returns true if both IP addresses have the same value
   */
  equals(other: IpAddress): boolean {
    return this.value === other.value;
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Returns a JSON representation
   */
  toJSON(): string {
    return this.value;
  }
}
