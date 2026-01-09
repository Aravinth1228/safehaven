// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Starting TouristSafety Contract Deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contract with account:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. Make sure you have enough ETH for deployment.\n");
  }

  // Deploy contract
  console.log("⏳ Deploying TouristSafety contract...");
  const TouristSafety = await hre.ethers.getContractFactory("TouristSafety");
  const contract = await TouristSafety.deploy();

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n✅ TouristSafety deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Network:", hre.network.name);
  console.log("👤 Owner:", deployer.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verify contract info
  console.log("📋 Verifying contract deployment...");
  const owner = await contract.owner();
  const isOwnerAdmin = await contract.isAdmin(deployer.address);
  
  console.log("✓ Owner address:", owner);
  console.log("✓ Deployer is admin:", isOwnerAdmin);
  console.log("✓ Contract initialized successfully!\n");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentPath, "\n");

  // Network-specific instructions
  if (hre.network.name === "sepolia") {
    console.log("🔍 View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}\n`);
    
    console.log("⚠️  IMPORTANT: To verify your contract on Etherscan, run:");
    console.log(`   npx hardhat verify --network sepolia ${contractAddress}\n`);
  }

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("🏠 Local deployment detected");
    console.log("   Contract is running on local blockchain\n");
  }

  // Update instructions
  console.log("📝 NEXT STEPS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. Update src/lib/contract/abi.ts:");
  console.log(`   ${hre.network.name}: "${contractAddress}"`);
  console.log("");
  console.log("2. Add contract address to your .env file:");
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("");
  console.log("3. Test the contract:");
  console.log("   - Register a tourist");
  console.log("   - Create danger zones");
  console.log("   - Update tourist status");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });