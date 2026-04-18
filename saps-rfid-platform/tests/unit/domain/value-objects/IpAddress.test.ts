import { IpAddress } from '@domain/value-objects/IpAddress';
import { InvalidIpAddressError } from '@domain/errors/InvalidIpAddressError';

describe('IpAddress', () => {
  const validIpv4 = '192.168.1.100';

  describe('create', () => {
    describe('valid IPv4 addresses', () => {
      it('should create valid IPv4 address', () => {
        const result = IpAddress.create(validIpv4);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe(validIpv4);
        }
      });

      it('should create address with all zeros', () => {
        const result = IpAddress.create('0.0.0.0');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('0.0.0.0');
        }
      });

      it('should create address with max values', () => {
        const result = IpAddress.create('255.255.255.255');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('255.255.255.255');
        }
      });

      it('should create loopback address', () => {
        const result = IpAddress.create('127.0.0.1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('127.0.0.1');
        }
      });

      it('should create private 10.x.x.x address', () => {
        const result = IpAddress.create('10.0.0.1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('10.0.0.1');
        }
      });

      it('should create private 172.16.x.x address', () => {
        const result = IpAddress.create('172.16.0.1');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('172.16.0.1');
        }
      });

      it('should create public address', () => {
        const result = IpAddress.create('8.8.8.8');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('8.8.8.8');
        }
      });

      it('should trim whitespace', () => {
        const result = IpAddress.create('  192.168.1.100  ');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('192.168.1.100');
        }
      });

      it('should handle leading zeros in octets', () => {
        // Note: The regex allows leading zeros (e.g., 01, 001)
        const result = IpAddress.create('192.168.001.100');

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.getValue()).toBe('192.168.001.100');
        }
      });
    });

    describe('invalid IPv4 addresses', () => {
      it('should reject empty string', () => {
        const result = IpAddress.create('');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
          expect(result.error.message).toContain('cannot be empty');
        }
      });

      it('should reject whitespace only', () => {
        const result = IpAddress.create('   ');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
          expect(result.error.message).toContain('cannot be empty');
        }
      });

      it('should reject octet value greater than 255', () => {
        const result = IpAddress.create('192.168.1.256');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
          expect(result.error.message).toContain('valid IPv4');
        }
      });

      it('should reject negative octet value', () => {
        const result = IpAddress.create('192.168.-1.100');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject too few octets', () => {
        const result = IpAddress.create('192.168.1');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
          expect(result.error.message).toContain('valid IPv4');
        }
      });

      it('should reject too many octets', () => {
        const result = IpAddress.create('192.168.1.100.50');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject alphabetic characters', () => {
        const result = IpAddress.create('192.168.1.abc');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject special characters', () => {
        const result = IpAddress.create('192.168.1.10@');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject double dots', () => {
        const result = IpAddress.create('192.168..100');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject leading dot', () => {
        const result = IpAddress.create('.192.168.1.100');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject trailing dot', () => {
        const result = IpAddress.create('192.168.1.100.');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject IPv6 address', () => {
        const result = IpAddress.create('2001:0db8:85a3:0000:0000:8a2e:0370:7334');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject IPv6 loopback', () => {
        const result = IpAddress.create('::1');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject hostname', () => {
        const result = IpAddress.create('localhost');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject FQDN', () => {
        const result = IpAddress.create('example.com');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });

      it('should reject octet value of 999', () => {
        const result = IpAddress.create('999.999.999.999');

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(InvalidIpAddressError);
        }
      });
    });
  });

  describe('fromString', () => {
    it('should be an alias for create', () => {
      const createResult = IpAddress.create(validIpv4);
      const fromStringResult = IpAddress.fromString(validIpv4);

      expect(createResult.isOk()).toBe(true);
      expect(fromStringResult.isOk()).toBe(true);
      if (createResult.isOk() && fromStringResult.isOk()) {
        expect(createResult.value.getValue()).toBe(fromStringResult.value.getValue());
      }
    });

    it('should reject invalid addresses like create', () => {
      const result = IpAddress.fromString('invalid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InvalidIpAddressError);
      }
    });
  });

  describe('getValue', () => {
    it('should return the raw IP address value', () => {
      const ip = IpAddress.create(validIpv4)._unsafeUnwrap();

      expect(ip.getValue()).toBe(validIpv4);
    });
  });

  describe('getOctets', () => {
    it('should return array of 4 octets', () => {
      const ip = IpAddress.create('192.168.1.100')._unsafeUnwrap();
      const octets = ip.getOctets();

      expect(octets).toEqual([192, 168, 1, 100]);
      expect(octets).toHaveLength(4);
    });

    it('should handle all zeros', () => {
      const ip = IpAddress.create('0.0.0.0')._unsafeUnwrap();
      const octets = ip.getOctets();

      expect(octets).toEqual([0, 0, 0, 0]);
    });

    it('should handle max values', () => {
      const ip = IpAddress.create('255.255.255.255')._unsafeUnwrap();
      const octets = ip.getOctets();

      expect(octets).toEqual([255, 255, 255, 255]);
    });

    it('should handle mixed values', () => {
      const ip = IpAddress.create('10.20.30.40')._unsafeUnwrap();
      const octets = ip.getOctets();

      expect(octets).toEqual([10, 20, 30, 40]);
    });
  });

  describe('isPrivate', () => {
    describe('10.0.0.0/8 range', () => {
      it('should return true for 10.0.0.0', () => {
        const ip = IpAddress.create('10.0.0.0')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 10.0.0.1', () => {
        const ip = IpAddress.create('10.0.0.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 10.255.255.255', () => {
        const ip = IpAddress.create('10.255.255.255')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 10.100.50.25', () => {
        const ip = IpAddress.create('10.100.50.25')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });
    });

    describe('172.16.0.0/12 range', () => {
      it('should return true for 172.16.0.0', () => {
        const ip = IpAddress.create('172.16.0.0')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 172.16.0.1', () => {
        const ip = IpAddress.create('172.16.0.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 172.31.255.255', () => {
        const ip = IpAddress.create('172.31.255.255')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 172.20.0.1', () => {
        const ip = IpAddress.create('172.20.0.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return false for 172.15.255.255 (below range)', () => {
        const ip = IpAddress.create('172.15.255.255')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });

      it('should return false for 172.32.0.0 (above range)', () => {
        const ip = IpAddress.create('172.32.0.0')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });
    });

    describe('192.168.0.0/16 range', () => {
      it('should return true for 192.168.0.0', () => {
        const ip = IpAddress.create('192.168.0.0')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 192.168.0.1', () => {
        const ip = IpAddress.create('192.168.0.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 192.168.255.255', () => {
        const ip = IpAddress.create('192.168.255.255')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return true for 192.168.1.100', () => {
        const ip = IpAddress.create('192.168.1.100')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(true);
      });

      it('should return false for 192.167.0.1 (below range)', () => {
        const ip = IpAddress.create('192.167.0.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });

      it('should return false for 192.169.0.1 (above range)', () => {
        const ip = IpAddress.create('192.169.0.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });
    });

    describe('public addresses', () => {
      it('should return false for 8.8.8.8', () => {
        const ip = IpAddress.create('8.8.8.8')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });

      it('should return false for 1.1.1.1', () => {
        const ip = IpAddress.create('1.1.1.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });

      it('should return false for 203.0.113.1', () => {
        const ip = IpAddress.create('203.0.113.1')._unsafeUnwrap();

        expect(ip.isPrivate()).toBe(false);
      });
    });
  });

  describe('isLoopback', () => {
    it('should return true for 127.0.0.1', () => {
      const ip = IpAddress.create('127.0.0.1')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(true);
    });

    it('should return true for 127.0.0.0', () => {
      const ip = IpAddress.create('127.0.0.0')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(true);
    });

    it('should return true for 127.255.255.255', () => {
      const ip = IpAddress.create('127.255.255.255')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(true);
    });

    it('should return true for 127.0.1.1', () => {
      const ip = IpAddress.create('127.0.1.1')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(true);
    });

    it('should return false for 126.0.0.1', () => {
      const ip = IpAddress.create('126.0.0.1')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(false);
    });

    it('should return false for 128.0.0.1', () => {
      const ip = IpAddress.create('128.0.0.1')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(false);
    });

    it('should return false for private address', () => {
      const ip = IpAddress.create('192.168.1.1')._unsafeUnwrap();

      expect(ip.isLoopback()).toBe(false);
    });
  });

  describe('toInteger', () => {
    it('should convert 0.0.0.0 to 0', () => {
      const ip = IpAddress.create('0.0.0.0')._unsafeUnwrap();

      expect(ip.toInteger()).toBe(0);
    });

    it('should convert 0.0.0.1 to 1', () => {
      const ip = IpAddress.create('0.0.0.1')._unsafeUnwrap();

      expect(ip.toInteger()).toBe(1);
    });

    it('should convert 0.0.1.0 to 256', () => {
      const ip = IpAddress.create('0.0.1.0')._unsafeUnwrap();

      expect(ip.toInteger()).toBe(256);
    });

    it('should convert 0.1.0.0 to 65536', () => {
      const ip = IpAddress.create('0.1.0.0')._unsafeUnwrap();

      expect(ip.toInteger()).toBe(65536);
    });

    it('should convert 1.0.0.0 to 16777216', () => {
      const ip = IpAddress.create('1.0.0.0')._unsafeUnwrap();

      expect(ip.toInteger()).toBe(16777216);
    });

    it('should convert 255.255.255.255 to 4294967295', () => {
      const ip = IpAddress.create('255.255.255.255')._unsafeUnwrap();

      expect(ip.toInteger()).toBe(4294967295);
    });

    it('should convert 192.168.1.100 correctly', () => {
      const ip = IpAddress.create('192.168.1.100')._unsafeUnwrap();
      // 192 * 2^24 + 168 * 2^16 + 1 * 2^8 + 100
      // = 3232235876

      expect(ip.toInteger()).toBe(3232235876);
    });

    it('should convert 8.8.8.8 correctly', () => {
      const ip = IpAddress.create('8.8.8.8')._unsafeUnwrap();
      // 8 * 2^24 + 8 * 2^16 + 8 * 2^8 + 8
      // = 134744072

      expect(ip.toInteger()).toBe(134744072);
    });

    it('should convert 127.0.0.1 correctly', () => {
      const ip = IpAddress.create('127.0.0.1')._unsafeUnwrap();
      // 127 * 2^24 + 0 * 2^16 + 0 * 2^8 + 1
      // = 2130706433

      expect(ip.toInteger()).toBe(2130706433);
    });
  });

  describe('equals', () => {
    it('should return true for equal IP addresses', () => {
      const ip1 = IpAddress.create(validIpv4)._unsafeUnwrap();
      const ip2 = IpAddress.create(validIpv4)._unsafeUnwrap();

      expect(ip1.equals(ip2)).toBe(true);
    });

    it('should return true for same IP address with whitespace trimmed', () => {
      const ip1 = IpAddress.create('192.168.1.100')._unsafeUnwrap();
      const ip2 = IpAddress.create('  192.168.1.100  ')._unsafeUnwrap();

      expect(ip1.equals(ip2)).toBe(true);
    });

    it('should return false for different IP addresses', () => {
      const ip1 = IpAddress.create('192.168.1.100')._unsafeUnwrap();
      const ip2 = IpAddress.create('192.168.1.101')._unsafeUnwrap();

      expect(ip1.equals(ip2)).toBe(false);
    });

    it('should return false for completely different IP addresses', () => {
      const ip1 = IpAddress.create('192.168.1.100')._unsafeUnwrap();
      const ip2 = IpAddress.create('10.0.0.1')._unsafeUnwrap();

      expect(ip1.equals(ip2)).toBe(false);
    });

    it('should be symmetric', () => {
      const ip1 = IpAddress.create('192.168.1.100')._unsafeUnwrap();
      const ip2 = IpAddress.create('192.168.1.100')._unsafeUnwrap();

      expect(ip1.equals(ip2)).toBe(ip2.equals(ip1));
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const ip = IpAddress.create(validIpv4)._unsafeUnwrap();

      expect(ip.toString()).toBe(validIpv4);
    });

    it('should return trimmed string', () => {
      const ip = IpAddress.create('  192.168.1.100  ')._unsafeUnwrap();

      expect(ip.toString()).toBe('192.168.1.100');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const ip = IpAddress.create(validIpv4)._unsafeUnwrap();

      expect(ip.toJSON()).toBe(validIpv4);
    });

    it('should serialize correctly with JSON.stringify', () => {
      const ip = IpAddress.create(validIpv4)._unsafeUnwrap();
      const obj = { ip };

      expect(JSON.stringify(obj)).toBe('{"ip":"192.168.1.100"}');
    });
  });

  describe('edge cases', () => {
    it('should handle boundary value 0.0.0.255', () => {
      const result = IpAddress.create('0.0.0.255');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getOctets()).toEqual([0, 0, 0, 255]);
      }
    });

    it('should handle boundary value 255.0.0.0', () => {
      const result = IpAddress.create('255.0.0.0');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getOctets()).toEqual([255, 0, 0, 0]);
      }
    });

    it('should handle single digit octets', () => {
      const result = IpAddress.create('1.2.3.4');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.getValue()).toBe('1.2.3.4');
        expect(result.value.getOctets()).toEqual([1, 2, 3, 4]);
      }
    });

    it('should distinguish between similar looking addresses', () => {
      const ip1 = IpAddress.create('192.168.1.10')._unsafeUnwrap();
      const ip2 = IpAddress.create('192.168.1.100')._unsafeUnwrap();

      expect(ip1.equals(ip2)).toBe(false);
      expect(ip1.toInteger()).not.toBe(ip2.toInteger());
    });
  });
});
