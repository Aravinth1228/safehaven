import { ethers, BrowserProvider, Contract } from 'ethers';
import { TOURIST_SAFETY_ABI, CONTRACT_ADDRESSES, TouristStatus, NetworkName } from './abi';
import {
  Tourist,
  DangerZone,
  EmergencyAlert,
  toContractCoordinate,
  fromContractCoordinate,
  toContractTimestamp,
  fromContractTimestamp,
} from './types';

class ContractService {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;
  private signer: ethers.Signer | null = null;
  private contractAddress: string = '';

  async initialize(): Promise<boolean> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      const network = await this.provider.getNetwork();
      const networkName = this.getNetworkName(network.chainId);
      
      this.contractAddress = CONTRACT_ADDRESSES[networkName] || CONTRACT_ADDRESSES.localhost;
      
      if (!this.contractAddress) {
        throw new Error(`Contract not deployed on network: ${networkName}`);
      }

      this.signer = await this.provider.getSigner();
      this.contract = new Contract(this.contractAddress, TOURIST_SAFETY_ABI, this.signer);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize contract service:', error);
      throw error;
    }
  }

  private getNetworkName(chainId: bigint): NetworkName {
    const chainIdMap: Record<string, NetworkName> = {
      '1': 'mainnet',
      '11155111': 'sepolia',
      '31337': 'localhost',
    };
    return chainIdMap[chainId.toString()] || 'localhost';
  }

  private ensureInitialized(): void {
    if (!this.contract || !this.signer) {
      throw new Error('Contract service not initialized. Call initialize() first.');
    }
  }

  // ==================== Fee Management (Mock) ====================
  
  /**
   * Get registration fee - Returns "0" since your contract doesn't charge fees
   */
  async getRegistrationFee(): Promise<string> {
    // Your contract doesn't have a fee system
    return '0';
  }

  /**
   * Get owner address
   */
  async getOwner(): Promise<string> {
    try {
      this.ensureInitialized();
      return await this.contract!.owner();
    } catch (error) {
      console.error('Failed to get owner:', error);
      throw error;
    }
  }

  // ==================== Tourist Functions ====================

  /**
   * Register tourist on blockchain
   * NOTE: Your contract generates the touristId automatically!
   * Contract signature: registerTourist(username, email, phone, dob)
   */
  async registerTourist(
    touristId: string,  // We receive this but DON'T send it to contract
    username: string,
    email: string,
    phone: string,
    dob: Date
  ): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const dobTimestamp = toContractTimestamp(dob);
    
    console.log('Registering on blockchain:', {
      username,
      email,
      phone,
      dobTimestamp
    });
    
    // Call contract WITHOUT touristId - contract generates it!
    const tx = await this.contract!.registerTourist(
      username,
      email,
      phone,
      dobTimestamp
    );
    
    return tx;
  }

  /**
   * Get the tourist ID from blockchain after registration
   */
  async getTouristIdFromBlockchain(address: string): Promise<string | null> {
    try {
      this.ensureInitialized();
      const tourist = await this.contract!.getTourist(address);
      if (!tourist.isActive) return null;
      return tourist.touristId;
    } catch (error) {
      console.error('Failed to get tourist ID from blockchain:', error);
      return null;
    }
  }

  async getTourist(address: string): Promise<Tourist | null> {
    this.ensureInitialized();
    try {
      const tourist = await this.contract!.getTourist(address);
      if (!tourist.isActive) return null;
      return tourist;
    } catch {
      return null;
    }
  }

  async isTouristRegistered(address: string): Promise<boolean> {
    this.ensureInitialized();
    try {
      return await this.contract!.isRegistered(address);
    } catch {
      return false;
    }
  }

  async updateStatus(status: keyof typeof TouristStatus): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const statusValue = TouristStatus[status];
    const tx = await this.contract!.updateStatus(statusValue);
    return tx;
  }

  async updateLocation(lat: number, lng: number): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const contractLat = toContractCoordinate(lat);
    const contractLng = toContractCoordinate(lng);
    const tx = await this.contract!.updateLocation(contractLat, contractLng);
    return tx;
  }

  // ==================== Admin Functions ====================

  async isAdmin(address: string): Promise<boolean> {
    this.ensureInitialized();
    try {
      return await this.contract!.isAdmin(address);
    } catch {
      return false;
    }
  }

  async addAdmin(address: string): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const tx = await this.contract!.addAdmin(address);
    return tx;
  }

  async removeAdmin(address: string): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const tx = await this.contract!.removeAdmin(address);
    return tx;
  }

  async dismissAlert(alertIndex: number): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const tx = await this.contract!.dismissAlert(alertIndex);
    return tx;
  }

  // ==================== Danger Zone Functions ====================

  async createDangerZone(
    name: string,
    lat: number,
    lng: number,
    radius: number,
    level: string
  ): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const contractLat = toContractCoordinate(lat);
    const contractLng = toContractCoordinate(lng);
    
    // Map level string to enum (0=Low, 1=Medium, 2=High, 3=Critical)
    const levelMap: Record<string, number> = {
      'Low Risk': 0,
      'Medium Risk': 1,
      'High Risk': 2,
      'Critical': 3
    };
    const levelValue = levelMap[level] ?? 1;
    
    const tx = await this.contract!.createDangerZone(
      name,
      contractLat,
      contractLng,
      BigInt(radius),
      levelValue
    );
    return tx;
  }

  async removeDangerZone(zoneIndex: number): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const tx = await this.contract!.removeDangerZone(zoneIndex);
    return tx;
  }

  async getDangerZone(zoneIndex: number): Promise<DangerZone | null> {
    this.ensureInitialized();
    try {
      const zones = await this.contract!.getAllDangerZones();
      if (zoneIndex >= zones.length) return null;
      const zone = zones[zoneIndex];
      if (!zone.isActive) return null;
      return zone;
    } catch {
      return null;
    }
  }

  async getDangerZoneCount(): Promise<number> {
    this.ensureInitialized();
    try {
      const zones = await this.contract!.getAllDangerZones();
      return zones.length;
    } catch {
      return 0;
    }
  }

  async getAllActiveDangerZones(): Promise<Array<DangerZone & { latNum: number; lngNum: number }>> {
    this.ensureInitialized();
    try {
      const zones = await this.contract!.getActiveDangerZones();
      return zones.map((zone: any) => ({
        ...zone,
        latNum: fromContractCoordinate(zone.latitude),
        lngNum: fromContractCoordinate(zone.longitude),
      }));
    } catch {
      return [];
    }
  }

  // ==================== Emergency Alert Functions ====================

  async getEmergencyAlert(alertIndex: number): Promise<EmergencyAlert | null> {
    this.ensureInitialized();
    try {
      const alerts = await this.contract!.getAllAlerts();
      if (alertIndex >= alerts.length) return null;
      return alerts[alertIndex];
    } catch {
      return null;
    }
  }

  async getEmergencyAlertCount(): Promise<number> {
    this.ensureInitialized();
    try {
      return Number(await this.contract!.alertCount());
    } catch {
      return 0;
    }
  }

  async getActiveEmergencyAlerts(): Promise<Array<EmergencyAlert & { id: number; latNum: number; lngNum: number; date: Date }>> {
    this.ensureInitialized();
    try {
      const alerts = await this.contract!.getActiveAlerts();
      return alerts.map((alert: any, index: number) => ({
        ...alert,
        id: index,
        latNum: fromContractCoordinate(alert.latitude),
        lngNum: fromContractCoordinate(alert.longitude),
        date: fromContractTimestamp(alert.timestamp),
      }));
    } catch {
      return [];
    }
  }

  // ==================== Event Listeners ====================

  onTouristRegistered(callback: (wallet: string, touristId: string, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('TouristRegistered', callback);
  }

  onStatusUpdated(callback: (tourist: string, touristId: string, oldStatus: number, newStatus: number, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('StatusUpdated', callback);
  }

  onLocationUpdated(callback: (tourist: string, touristId: string, lat: bigint, lng: bigint, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('LocationUpdated', callback);
  }

  onEmergencyAlertCreated(callback: (alertId: string, tourist: string, touristId: string, status: number, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('EmergencyAlertCreated', callback);
  }

  onDangerZoneCreated(callback: (zoneId: string, name: string, lat: bigint, lng: bigint, radius: bigint, level: number, createdBy: string) => void): void {
    this.ensureInitialized();
    this.contract!.on('DangerZoneCreated', callback);
  }

  removeAllListeners(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  // ==================== Utility ====================

  getContractAddress(): string {
    return this.contractAddress;
  }

  async getSignerAddress(): Promise<string> {
    this.ensureInitialized();
    return await this.signer!.getAddress();
  }

  async getTouristCount(): Promise<number> {
    this.ensureInitialized();
    try {
      return Number(await this.contract!.getTouristCount());
    } catch {
      return 0;
    }
  }
}

// Singleton instance
export const contractService = new ContractService();