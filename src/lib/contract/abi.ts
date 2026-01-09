// src/lib/contract/abi.ts

// TouristSafety Contract ABI - Matches your actual contract
export const TOURIST_SAFETY_ABI = [
  // Events
  "event TouristRegistered(address indexed wallet, string touristId, string username, uint256 timestamp)",
  "event StatusUpdated(address indexed tourist, string touristId, uint8 oldStatus, uint8 newStatus, uint256 timestamp)",
  "event LocationUpdated(address indexed tourist, string touristId, int256 latitude, int256 longitude, uint256 timestamp)",
  "event DangerZoneCreated(string zoneId, string name, int256 latitude, int256 longitude, uint256 radius, uint8 level, address createdBy)",
  "event DangerZoneUpdated(string zoneId, string name, uint256 radius, uint8 level)",
  "event DangerZoneRemoved(string zoneId, address removedBy)",
  "event EmergencyAlertCreated(string alertId, address indexed tourist, string touristId, uint8 status, uint256 timestamp)",
  "event AlertDismissed(string alertId, address dismissedBy)",
  "event AdminAdded(address indexed admin, address addedBy)",
  "event AdminRemoved(address indexed admin, address removedBy)",
  
  // Read Functions
  "function owner() view returns (address)",
  "function admins(uint256) view returns (address)",
  "function isAdmin(address) view returns (bool)",
  "function tourists(address) view returns (string touristId, string username, string email, string phone, uint256 dateOfBirth, uint8 status, uint256 registeredAt, bool isActive, int256 lastLatitude, int256 lastLongitude, uint256 lastLocationUpdate)",
  "function touristIdToAddress(string) view returns (address)",
  "function registeredTourists(uint256) view returns (address)",
  "function dangerZones(uint256) view returns (string zoneId, string name, int256 latitude, int256 longitude, uint256 radius, uint8 level, address createdBy, uint256 createdAt, bool isActive)",
  "function zoneIdToIndex(string) view returns (uint256)",
  "function alerts(uint256) view returns (string alertId, address tourist, string touristId, uint8 status, int256 latitude, int256 longitude, string zoneName, uint8 zoneLevel, uint256 timestamp, bool isDismissed)",
  "function alertCount() view returns (uint256)",
  
  // Write Functions - Tourist
  "function registerTourist(string username, string email, string phone, uint256 dateOfBirth) returns (string)",
  "function updateStatus(uint8 status)",
  "function updateLocation(int256 latitude, int256 longitude)",
  
  // Write Functions - Admin
  "function addAdmin(address admin)",
  "function removeAdmin(address admin)",
  "function createDangerZone(string name, int256 latitude, int256 longitude, uint256 radius, uint8 level) returns (string)",
  "function updateDangerZone(uint256 zoneIndex, string name, uint256 radius, uint8 level)",
  "function removeDangerZone(uint256 zoneIndex)",
  "function dismissAlert(uint256 alertIndex)",
  
  // View Functions
  "function getTourist(address wallet) view returns (tuple(string touristId, string username, string email, string phone, uint256 dateOfBirth, uint8 status, uint256 registeredAt, bool isActive, int256 lastLatitude, int256 lastLongitude, uint256 lastLocationUpdate))",
  "function getTouristById(string touristId) view returns (tuple(string touristId, string username, string email, string phone, uint256 dateOfBirth, uint8 status, uint256 registeredAt, bool isActive, int256 lastLatitude, int256 lastLongitude, uint256 lastLocationUpdate))",
  "function getAllTourists() view returns (tuple(string touristId, string username, string email, string phone, uint256 dateOfBirth, uint8 status, uint256 registeredAt, bool isActive, int256 lastLatitude, int256 lastLongitude, uint256 lastLocationUpdate)[])",
  "function getAllDangerZones() view returns (tuple(string zoneId, string name, int256 latitude, int256 longitude, uint256 radius, uint8 level, address createdBy, uint256 createdAt, bool isActive)[])",
  "function getActiveDangerZones() view returns (tuple(string zoneId, string name, int256 latitude, int256 longitude, uint256 radius, uint8 level, address createdBy, uint256 createdAt, bool isActive)[])",
  "function getAllAlerts() view returns (tuple(string alertId, address tourist, string touristId, uint8 status, int256 latitude, int256 longitude, string zoneName, uint8 zoneLevel, uint256 timestamp, bool isDismissed)[])",
  "function getActiveAlerts() view returns (tuple(string alertId, address tourist, string touristId, uint8 status, int256 latitude, int256 longitude, string zoneName, uint8 zoneLevel, uint256 timestamp, bool isDismissed)[])",
  "function getAdmins() view returns (address[])",
  "function getTouristCount() view returns (uint256)",
  "function isRegistered(address wallet) view returns (bool)",
  "function getTouristsByStatus(uint8 status) view returns (tuple(string touristId, string username, string email, string phone, uint256 dateOfBirth, uint8 status, uint256 registeredAt, bool isActive, int256 lastLatitude, int256 lastLongitude, uint256 lastLocationUpdate)[])"
] as const;

// Status enum mapping - Matches your contract
export const TouristStatus = {
  Safe: 0,
  Alert: 1,
  Emergency: 2
} as const;

// Zone level mapping
export const ZoneLevel = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3
} as const;

export type TouristStatusType = typeof TouristStatus[keyof typeof TouristStatus];
export type ZoneLevelType = typeof ZoneLevel[keyof typeof ZoneLevel];

// Contract addresses (update after deployment)
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet
  mainnet: "",
  // Sepolia Testnet
  sepolia: "0xc3cAe59a5eeccDE6d38f976ca6723C7944CE14c2", // ⚠️ UPDATE THIS AFTER DEPLOYMENT
  // Local development
  localhost: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Update with your local deployment
} as const;

export type NetworkName = keyof typeof CONTRACT_ADDRESSES;