# Tourist Safety System - Full Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Smart Contract](#smart-contract)
4. [Database Schema](#database-schema)
5. [Authentication](#authentication)
6. [API Reference](#api-reference)
7. [User Flows](#user-flows)
8. [Admin Features](#admin-features)
9. [Security](#security)
10. [Deployment](#deployment)

---

## Overview

The Tourist Safety System is a comprehensive web application designed for real-time tourist tracking and emergency assistance. It combines blockchain-based identity management with traditional database storage for a robust, secure, and scalable solution.

### Key Features

- **MetaMask Wallet Integration**: Users authenticate using their Ethereum wallet
- **Tourist ID Generation**: Unique identifier (TID-XXXXXX-XXXX) for each registered tourist
- **Real-time Location Tracking**: GPS-based tracking with Mapbox integration
- **Danger Zone Management**: 3D visualization of geofenced danger areas
- **Emergency Alert System**: Instant notifications when tourists enter danger zones or trigger alerts
- **Admin Dashboard**: Comprehensive monitoring and management interface

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| UI Components | shadcn/ui, Radix UI |
| Maps | Mapbox GL JS |
| Blockchain | Ethereum, MetaMask, Solidity |
| Backend | Lovable Cloud (Supabase) |
| Database | PostgreSQL with Row Level Security |
| Authentication | Supabase Auth + MetaMask |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────┬─────────────────┬────────────────────────────┤
│   User Pages    │   Admin Pages   │      Shared Components      │
│  - Login        │  - Dashboard    │  - Navbar                   │
│  - SignUp       │  - User Monitor │  - MapboxMap                │
│  - Dashboard    │  - Zone Manager │  - MetaMaskGuide            │
│  - Contact      │                 │                              │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                        │
         ▼                 ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Context Providers                             │
│  - AuthContext (User state, login/logout)                        │
│  - WalletContext (MetaMask connection)                           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase DB   │    │  Ethereum Chain │    │   Mapbox API    │
│  - profiles     │    │  TouristSafety  │    │  - Maps         │
│  - alerts       │    │  Smart Contract │    │  - Geolocation  │
│  - danger_zones │    │                 │    │  - 3D Layers    │
│  - user_roles   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Smart Contract

### Contract Address
*Deploy to your preferred network and update the address here*

### Overview

The `TouristSafety.sol` contract provides on-chain management for:
- Tourist registration and identity
- Safety status tracking
- Danger zone definitions
- Emergency alert logging

### Enums

```solidity
enum SafetyStatus { Safe, Alert, Danger }
enum ZoneLevel { Low, Medium, High, Critical }
```

### Core Functions

#### Tourist Management

| Function | Access | Description |
|----------|--------|-------------|
| `registerTourist(username, email, phone, dob)` | Public | Register new tourist, returns Tourist ID |
| `updateStatus(status)` | Tourist Only | Update safety status |
| `updateLocation(lat, lng)` | Tourist Only | Update GPS location |
| `getTourist(address)` | Public | Get tourist details |
| `isRegistered(address)` | Public | Check if wallet is registered |

#### Danger Zone Management

| Function | Access | Description |
|----------|--------|-------------|
| `createDangerZone(name, lat, lng, radius, level)` | Admin | Create new danger zone |
| `updateDangerZone(index, name, radius, level)` | Admin | Modify existing zone |
| `removeDangerZone(index)` | Admin | Deactivate danger zone |
| `getActiveDangerZones()` | Public | List all active zones |

#### Alert Management

| Function | Access | Description |
|----------|--------|-------------|
| `getActiveAlerts()` | Admin | Get non-dismissed alerts |
| `dismissAlert(index)` | Admin | Mark alert as dismissed |

#### Admin Functions

| Function | Access | Description |
|----------|--------|-------------|
| `addAdmin(address)` | Owner | Grant admin privileges |
| `removeAdmin(address)` | Owner | Revoke admin privileges |
| `getAdmins()` | Public | List all admin addresses |

### Events

```solidity
event TouristRegistered(address wallet, string touristId, string username, uint256 timestamp);
event StatusUpdated(address tourist, string touristId, SafetyStatus oldStatus, SafetyStatus newStatus, uint256 timestamp);
event LocationUpdated(address tourist, string touristId, int256 latitude, int256 longitude, uint256 timestamp);
event DangerZoneCreated(string zoneId, string name, int256 lat, int256 lng, uint256 radius, ZoneLevel level, address createdBy);
event EmergencyAlertCreated(string alertId, address tourist, string touristId, SafetyStatus status, uint256 timestamp);
event AlertDismissed(string alertId, address dismissedBy);
```

---

## Database Schema

### Tables

#### `profiles`
Stores user profile information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Supabase Auth user ID |
| tourist_id | text | No | - | Unique tourist identifier |
| username | text | No | - | Display name |
| email | text | No | - | Email address |
| phone | text | Yes | - | Phone number |
| dob | date | Yes | - | Date of birth |
| wallet_address | text | Yes | - | MetaMask wallet address |
| status | text | Yes | 'safe' | Current safety status |
| created_at | timestamptz | Yes | now() | Registration time |
| updated_at | timestamptz | Yes | now() | Last update time |

#### `user_roles`
Manages admin/user role assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Supabase Auth user ID |
| role | app_role | No | - | 'admin' or 'user' |

#### `danger_zones`
Defines geofenced danger areas.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Zone name |
| lat | double | No | - | Center latitude |
| lng | double | No | - | Center longitude |
| radius | double | No | - | Radius in meters |
| level | text | Yes | 'medium' | Risk level |
| created_by | uuid | Yes | - | Admin who created |
| created_at | timestamptz | Yes | now() | Creation time |

#### `user_locations`
Tracks real-time user positions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Supabase Auth user ID |
| tourist_id | text | No | - | Tourist identifier |
| lat | double | No | - | Current latitude |
| lng | double | No | - | Current longitude |
| updated_at | timestamptz | Yes | now() | Last update time |

#### `alerts`
Stores emergency alerts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | Tourist's user ID |
| tourist_id | text | No | - | Tourist identifier |
| username | text | No | - | Tourist name |
| status | text | No | - | 'alert' or 'danger' |
| alert_type | text | Yes | 'status_change' | Type of alert |
| lat | double | Yes | - | Alert location lat |
| lng | double | Yes | - | Alert location lng |
| zone_name | text | Yes | - | Triggered zone name |
| zone_level | text | Yes | - | Zone risk level |
| dismissed | boolean | Yes | false | Alert dismissed? |
| created_at | timestamptz | Yes | now() | Alert timestamp |

### Database Functions

```sql
-- Generate unique tourist ID
generate_tourist_id() → text
-- Returns: 'TID-XXXXXX-XXXX'

-- Check if user has a specific role
has_role(_user_id uuid, _role app_role) → boolean
-- Returns: true if user has the role
```

---

## Authentication

### Dual Authentication System

The system supports two authentication methods:

#### 1. Email/Password + Tourist ID
- User registers with email, password, and profile details
- System generates unique Tourist ID
- Login via Tourist ID + password OR email + password

#### 2. MetaMask Wallet
- Connect MetaMask wallet during signup
- Wallet address linked to profile
- Login directly via wallet signature

### Auth Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Connect     │────▶│  Supabase    │────▶│   Profile    │
│  MetaMask    │     │  Auth        │     │   Created    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │         ┌──────────┴──────────┐         │
       │         │ Generate Tourist ID │         │
       │         └─────────────────────┘         │
       │                                         │
       ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│  Store in    │                         │  Redirect    │
│  LocalStorage│                         │  to Dashboard│
└──────────────┘                         └──────────────┘
```

### Admin Authentication

Admins must:
1. Have a valid Supabase Auth account
2. Have 'admin' role in `user_roles` table
3. Pass `has_role(auth.uid(), 'admin')` check

---

## API Reference

### Supabase Client Usage

```typescript
import { supabase } from "@/integrations/supabase/client";

// Fetch user profile
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Update status
const { error } = await supabase
  .from('profiles')
  .update({ status: 'alert' })
  .eq('user_id', userId);

// Get danger zones
const { data } = await supabase
  .from('danger_zones')
  .select('*');

// Create alert
const { error } = await supabase
  .from('alerts')
  .insert({
    user_id: userId,
    tourist_id: touristId,
    username: username,
    status: 'danger',
    lat: location.lat,
    lng: location.lng
  });
```

### Row Level Security Policies

| Table | Policy | Command | Rule |
|-------|--------|---------|------|
| profiles | Users can view own | SELECT | auth.uid() = user_id |
| profiles | Users can update own | UPDATE | auth.uid() = user_id |
| profiles | Admins can view all | SELECT | has_role('admin') |
| danger_zones | Anyone can view | SELECT | true |
| danger_zones | Admins can manage | ALL | has_role('admin') |
| alerts | Users can create own | INSERT | auth.uid() = user_id |
| alerts | Admins can view all | SELECT | has_role('admin') |
| alerts | Admins can update | UPDATE | has_role('admin') |

---

## User Flows

### Tourist Registration

1. User clicks "Sign Up"
2. Connects MetaMask wallet (required)
3. Fills registration form (username, email, DOB, phone, password)
4. System creates Supabase Auth user
5. Profile created with generated Tourist ID
6. User redirected to Dashboard

### Status Update

1. Tourist on Dashboard
2. Clicks status button (Safe/Alert/Danger)
3. Status updated in database
4. If Alert/Danger: Alert record created
5. Admins notified in real-time

### Location Tracking

1. Dashboard requests geolocation permission
2. Browser provides GPS coordinates
3. Location saved to `user_locations` table
4. Map updates with new position
5. System checks proximity to danger zones
6. If in danger zone: Auto-alert triggered

---

## Admin Features

### Dashboard Metrics

- **Total Users**: Count of registered tourists
- **Active Users**: Users with recent location updates
- **Users in Danger**: Count with status='danger'
- **Active Alerts**: Non-dismissed alert count

### Danger Zone Management

Admins can:
- View all zones on 3D map
- Create new zones with:
  - Name/Description
  - Center coordinates (click on map)
  - Radius (meters)
  - Risk level (Low/Medium/High/Critical)
- Edit existing zones
- Delete/deactivate zones

### Alert Management

- View all active alerts in real-time
- See tourist location on map
- View alert details (time, location, trigger)
- Dismiss resolved alerts
- Filter by status, zone, time

---

## Security

### Authentication Security

- Passwords hashed by Supabase Auth
- JWT tokens for API authentication
- MetaMask signatures for wallet verification
- Session management with auto-refresh

### Database Security

- Row Level Security (RLS) on all tables
- Role-based access control
- Admin functions protected by `has_role()` check
- No direct table access without authentication

### Smart Contract Security

- `onlyOwner` modifier for owner functions
- `onlyAdmin` modifier for admin functions
- `onlyRegisteredTourist` for tourist actions
- Event logging for audit trail

### Best Practices

- Never store private keys in code
- Use environment variables for secrets
- Input validation on all forms
- Sanitize data before storage
- HTTPS for all communications

---

## Deployment

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Ethereum wallet with funds (for contract deployment)

### Frontend Deployment

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Lovable
# Click "Publish" in Lovable interface
```

### Smart Contract Deployment

```bash
# Install Hardhat or Foundry
npm install --save-dev hardhat

# Compile contract
npx hardhat compile

# Deploy to network
npx hardhat run scripts/deploy.js --network <network>
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
```

---

## Support

For technical support or feature requests, please contact the development team or create an issue in the repository.

---

*Last Updated: January 2026*
*Version: 1.0.0*
