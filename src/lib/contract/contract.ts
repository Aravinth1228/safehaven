import { ethers, BrowserProvider, Contract } from 'ethers';
import { TOURIST_SAFETY_ABI, CONTRACT_ADDRESSES, TouristStatus, NetworkName, DEFAULT_REGISTRATION_FEE } from './abi';
import {
  Tourist,
  DangerZone,
  EmergencyAlert,
  toContractCoordinate,
  fromContractCoordinate,
  toContractTimestamp,
  fromContractTimestamp,
} from './types';

// Use existing ethereum type from WalletContext or check if exists

class ContractService {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;
  private signer: ethers.Signer | null = null;
  private contractAddress: string = '';

  // Initialize the service with MetaMask
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

  // ==================== Tourist Functions ====================

  // Get the current registration fee from contract
  async getRegistrationFee(): Promise<string> {
    this.ensureInitialized();
    try {
      const fee = await this.contract!.registrationFee();
      return ethers.formatEther(fee);
    } catch {
      // Return default if contract doesn't have fee function
      return DEFAULT_REGISTRATION_FEE;
    }
  }

  // Register tourist with fee payment to admin wallet
  async registerTourist(
    touristId: string,
    username: string,
    email: string,
    phone: string,
    dob: Date
  ): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    
    // Get registration fee
    const fee = await this.getRegistrationFee();
    const feeInWei = ethers.parseEther(fee);
    
    const dobTimestamp = toContractTimestamp(dob);
    
    // Send transaction with value (fee goes to contract/admin)
    const tx = await this.contract!.registerTourist(
      touristId, 
      username, 
      email, 
      phone, 
      dobTimestamp,
      { value: feeInWei }
    );
    return tx;
  }

  // Get contract owner (admin wallet that receives fees)
  async getOwner(): Promise<string> {
    this.ensureInitialized();
    return await this.contract!.owner();
  }

  async getTourist(address: string): Promise<Tourist | null> {
    this.ensureInitialized();
    try {
      const tourist = await this.contract!.getTourist(address);
      if (!tourist.isRegistered) return null;
      return tourist;
    } catch {
      return null;
    }
  }

  async isTouristRegistered(address: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.contract!.isTouristRegistered(address);
  }

  async updateStatus(status: keyof typeof TouristStatus): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const statusValue = TouristStatus[status];
    const tx = await this.contract!.updateStatus(statusValue);
    return tx;
  }

  async triggerEmergency(lat: number, lng: number): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const contractLat = toContractCoordinate(lat);
    const contractLng = toContractCoordinate(lng);
    const tx = await this.contract!.triggerEmergency(contractLat, contractLng);
    return tx;
  }

  // ==================== Admin Functions ====================

  async isAdmin(address: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.contract!.isAdmin(address);
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

  async resolveEmergency(alertId: number): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const tx = await this.contract!.resolveEmergency(alertId);
    return tx;
  }

  // ==================== Danger Zone Functions ====================

  async addDangerZone(
    name: string,
    lat: number,
    lng: number,
    radius: number,
    level: string
  ): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const contractLat = toContractCoordinate(lat);
    const contractLng = toContractCoordinate(lng);
    const tx = await this.contract!.addDangerZone(name, contractLat, contractLng, BigInt(radius), level);
    return tx;
  }

  async removeDangerZone(zoneId: number): Promise<ethers.ContractTransactionResponse> {
    this.ensureInitialized();
    const tx = await this.contract!.removeDangerZone(zoneId);
    return tx;
  }

  async getDangerZone(zoneId: number): Promise<DangerZone | null> {
    this.ensureInitialized();
    try {
      const zone = await this.contract!.getDangerZone(zoneId);
      if (!zone.active) return null;
      return {
        ...zone,
        lat: zone.lat,
        lng: zone.lng,
      };
    } catch {
      return null;
    }
  }

  async getDangerZoneCount(): Promise<number> {
    this.ensureInitialized();
    const count = await this.contract!.dangerZoneCount();
    return Number(count);
  }

  async getAllActiveDangerZones(): Promise<Array<DangerZone & { latNum: number; lngNum: number }>> {
    this.ensureInitialized();
    const count = await this.getDangerZoneCount();
    const zones: Array<DangerZone & { latNum: number; lngNum: number }> = [];
    
    for (let i = 0; i < count; i++) {
      const zone = await this.getDangerZone(i);
      if (zone && zone.active) {
        zones.push({
          ...zone,
          latNum: fromContractCoordinate(zone.lat),
          lngNum: fromContractCoordinate(zone.lng),
        });
      }
    }
    
    return zones;
  }

  // ==================== Emergency Alert Functions ====================

  async getEmergencyAlert(alertId: number): Promise<EmergencyAlert | null> {
    this.ensureInitialized();
    try {
      const alert = await this.contract!.getEmergencyAlert(alertId);
      return {
        ...alert,
        lat: alert.lat,
        lng: alert.lng,
      };
    } catch {
      return null;
    }
  }

  async getEmergencyAlertCount(): Promise<number> {
    this.ensureInitialized();
    const count = await this.contract!.emergencyAlertCount();
    return Number(count);
  }

  async getActiveEmergencyAlerts(): Promise<Array<EmergencyAlert & { id: number; latNum: number; lngNum: number; date: Date }>> {
    this.ensureInitialized();
    const count = await this.getEmergencyAlertCount();
    const alerts: Array<EmergencyAlert & { id: number; latNum: number; lngNum: number; date: Date }> = [];
    
    for (let i = 0; i < count; i++) {
      const alert = await this.getEmergencyAlert(i);
      if (alert && !alert.resolved) {
        alerts.push({
          ...alert,
          id: i,
          latNum: fromContractCoordinate(alert.lat),
          lngNum: fromContractCoordinate(alert.lng),
          date: fromContractTimestamp(alert.timestamp),
        });
      }
    }
    
    return alerts;
  }

  // ==================== Event Listeners ====================

  onTouristRegistered(callback: (tourist: string, touristId: string, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('TouristRegistered', callback);
  }

  onStatusUpdated(callback: (tourist: string, status: number, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('StatusUpdated', callback);
  }

  onEmergencyAlert(callback: (tourist: string, touristId: string, lat: bigint, lng: bigint, timestamp: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('EmergencyAlert', callback);
  }

  onDangerZoneAdded(callback: (zoneId: bigint, name: string, lat: bigint, lng: bigint, radius: bigint) => void): void {
    this.ensureInitialized();
    this.contract!.on('DangerZoneAdded', callback);
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
}

// Singleton instance
export const contractService = new ContractService();