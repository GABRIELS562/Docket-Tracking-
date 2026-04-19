# Research Notes — Core Docket Tracking

**Date**: 2026-04-19
**Status**: Complete (Focused)

---

## 1. Decided Items (No Re-Research Needed)

Per spec v1.4, the following decisions are final:

| Item                 | Decision                          | Source |
| -------------------- | --------------------------------- | ------ |
| ZD621R Integration   | Network via ZPL over TCP 9100     | Q10    |
| Handheld RSSI Access | Native Android wrapper required   | Q11    |
| Reader Protocol      | MQTT via Mosquitto                | Q12    |
| 3D Visualization     | Keep as optional toggle           | Q13    |
| Analytics Engine     | Phase 2                           | Q14    |
| Pathfinding          | Zone-level route line for v1      | Q16    |
| i18n                 | English + Afrikaans both required | Q18    |

---

## 2. Native Android Wrapper Approach

### 2.1 Options Evaluated

| Option                   | Pros                              | Cons                             |
| ------------------------ | --------------------------------- | -------------------------------- |
| **Capacitor Plugin**     | Cross-platform, npm-based         | Plugin maintenance burden, bloat |
| **Custom Java Bridge**   | Minimal, full control, documented | Android-only, custom development |
| **TagMatiks Commercial** | Pre-built, tested                 | Licence cost, vendor lock-in     |

### 2.2 Recommendation: Custom Java Bridge

**Rationale**: The MC3330xR is the only handheld target. A custom Java bridge:

- Is documented in Zebra EMDK samples
- Adds ~200 lines of Java code
- Has no external dependencies beyond Zebra SDK
- Is fully under our control

Capacitor adds complexity for a single-platform target. TagMatiks adds licence cost and vendor risk.

**Effort**: Medium (1-3 days for basic implementation, 1 additional day for testing on device)

---

## 3. LDAP/SSO Library Selection

### 3.1 Options

| Library             | Maintenance | Notes                            |
| ------------------- | ----------- | -------------------------------- |
| `passport-ldapauth` | Active      | Most popular, well-documented    |
| `ldapjs`            | Stable      | Lower-level, more flexible       |
| `ldapts`            | Active      | TypeScript-native, promise-based |

### 3.2 Recommendation: `passport-ldapauth`

**Rationale**:

- Integrates with existing Express/Passport setup
- Handles LDAP connection pooling
- Well-documented for AD integration
- Supports fallback authentication (local admin)

**Configuration approach**:

```typescript
passport.use(
  new LdapStrategy({
    server: {
      url: process.env.LDAP_URL,
      bindDN: process.env.LDAP_BIND_DN,
      bindCredentials: process.env.LDAP_BIND_PASS,
      searchBase: process.env.LDAP_SEARCH_BASE,
      searchFilter: '(sAMAccountName={{username}})',
    },
    handleErrorsAsFailures: true,
  })
);
```

---

## 4. ZPL Generation Approach

### 4.1 Options

| Approach                | Pros                    | Cons                          |
| ----------------------- | ----------------------- | ----------------------------- |
| String templates        | Simple, no dependencies | Error-prone, hard to maintain |
| `zpl-image` library     | Image support           | Overkill for text labels      |
| Custom ZplBuilder class | Type-safe, testable     | Custom development            |

### 4.2 Recommendation: Custom ZplBuilder Class

**Rationale**: Tag labels are simple (text + RFID encode). A custom builder class:

- Is type-safe and testable
- Handles RFID encoding commands (`^RF`)
- Fits in ~100 lines of TypeScript

**Example**:

```typescript
class ZplBuilder {
  private commands: string[] = ['^XA'];

  text(x: number, y: number, text: string): this {
    this.commands.push(`^FO${x},${y}^FD${text}^FS`);
    return this;
  }

  encodeRfid(epc: string): this {
    this.commands.push(`^RFW,H^FD${epc}^FS`);
    return this;
  }

  build(): string {
    return [...this.commands, '^XZ'].join('\n');
  }
}
```

---

## 5. Email Service Provider

### 5.1 Options

| Option                   | Notes                               |
| ------------------------ | ----------------------------------- |
| Direct SMTP (nodemailer) | Customer provides SMTP server       |
| SendGrid/Mailgun         | Cloud dependency (violates on-prem) |

### 5.2 Recommendation: Direct SMTP via nodemailer

**Rationale**: On-premises requirement means no cloud email services. Customer provides SMTP credentials. Nodemailer is battle-tested, supports TLS, handles connection pooling.

---

## 6. Database Partitioning Strategy

### 6.1 Options for >200k Items

| Strategy                 | Pros                 | Cons                    |
| ------------------------ | -------------------- | ----------------------- |
| Range partition by date  | Simple, automatic    | Old items still queried |
| List partition by status | Active/archive split | Manual promotion        |
| Hash partition           | Even distribution    | No semantic grouping    |

### 6.2 Recommendation: List Partition by Status

**Rationale**:

- Active items (REGISTERED, IN_TRANSIT, IN_PROCESSING) in hot partition
- Archived items (ARCHIVED, DISPOSED, MISSING) in cold partition
- 95%+ of queries hit active partition
- Archive grows without affecting active query performance

**Migration**: Create partitioned table, migrate data, swap names.

---

## 7. TimescaleDB Configuration

### 7.1 Chunk Intervals

| Table              | Interval | Rationale                             |
| ------------------ | -------- | ------------------------------------- |
| `tag_reads`        | 1 day    | High write volume, compressed quickly |
| `location_history` | 1 week   | Lower volume, retained longer         |

### 7.2 Compression Policy

```sql
-- Compress tag_reads after 7 days
SELECT add_compression_policy('tag_reads', INTERVAL '7 days');

-- Retain 365 days
SELECT add_retention_policy('tag_reads', INTERVAL '365 days');
```

---

## 8. Deferred Research (Phase 2)

The following items require research only if Phase 2 proceeds:

- **HID/iClass Integration**: API research for access card reader models
- **Push Notifications**: Web Push API, VAPID key management
- **PWA Offline**: Service worker strategies, background sync
- **WAL Archiving**: MinIO/S3 integration, archive_command tuning
- **Analytics Engine**: Open3D licensing, Python/Node interop

---

## 9. Open Items

### 9.1 Site Survey Process [DEFERRED]

Not scoped for v1 spec. Before hardware procurement:

- Who performs survey? (Vendor or customer?)
- Deliverable format? (Report, CAD drawings?)
- RF interference assessment methodology?

### 9.2 IoT Connector Licence Verification [DECISION NEEDED]

Before procurement, verify FX9600 firmware version and whether IoT Connector licence is:

- Included in firmware
- Required as add-on purchase
- Per-reader or site-wide

This is a procurement decision, not architecture. Mark as procurement line item.

---

## Document History

| Version | Date       | Author | Changes                  |
| ------- | ---------- | ------ | ------------------------ |
| 1.0     | 2026-04-19 | Claude | Initial focused research |
