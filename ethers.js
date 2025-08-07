import { ethers } from 'ethers';
import 'dotenv/config.js';

const provider = new ethers.JsonRpcProvider(process.env.RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider); // PRIVATE_KEY = owner/minter of MockUSDC

const USDC_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) view returns (uint256)"
];

const USDC_ADDRESS = process.env.USDC_ADDRESS;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

async function mintUsdcToTreasury(amount) {
  // amount in USDC tokens (e.g. 1000), rawAmount is with 6 decimals
  const rawAmount = ethers.parseUnits(amount, 6); // 6 decimals for USDC
  const tx = await usdc.mint(TREASURY_ADDRESS, rawAmount);
  console.log("Mint tx:", tx.hash);
  await tx.wait();
  console.log(`Minted ${amount} USDC to treasury: ${TREASURY_ADDRESS}`);

  // Check balance
  const bal = await usdc.balanceOf(TREASURY_ADDRESS);
  console.log(
    `Treasury USDC balance: ${ethers.formatUnits(bal, 6)}`
  );
}

// Mint 1000 USDC (change as needed)
mintUsdcToTreasury("1000").catch(console.error);