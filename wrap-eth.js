// wrap-eth.js - Convert some ETH to WETH for arbitrage
import { ethers } from 'ethers';
import 'dotenv/config.js';

async function wrapETH() {
  console.log('🔄 Wrapping ETH to WETH for arbitrage...');
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // WETH ABI - deposit function
  const WETH_ABI = [
    "function deposit() payable",
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)"
  ];
  
  const wethContract = new ethers.Contract(process.env.WETH_ADDRESS, WETH_ABI, wallet);
  
  try {
    // Check current balances
    const ethBalance = await provider.getBalance(wallet.address);
    const wethBalance = await wethContract.balanceOf(wallet.address);
    
    console.log(`💰 Current ETH: ${ethers.formatEther(ethBalance)}`);
    console.log(`💰 Current WETH: ${ethers.formatEther(wethBalance)}`);
    
    // Wrap 0.05 ETH (keep most for gas)
    const wrapAmount = ethers.parseEther('0.05');
    
    if (BigInt(ethBalance) < wrapAmount) {
      console.log('❌ Insufficient ETH to wrap');
      return;
    }
    
    console.log(`🔄 Wrapping ${ethers.formatEther(wrapAmount)} ETH to WETH...`);
    
    // Execute wrap transaction
    const tx = await wethContract.deposit({ value: wrapAmount });
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ ETH wrapped successfully!');
      
      // Check new balances
      const newEthBalance = await provider.getBalance(wallet.address);
      const newWethBalance = await wethContract.balanceOf(wallet.address);
      
      console.log(`💰 New ETH: ${ethers.formatEther(newEthBalance)}`);
      console.log(`💰 New WETH: ${ethers.formatEther(newWethBalance)}`);
      console.log(`🎉 Ready for arbitrage!`);
    } else {
      console.log('❌ Transaction failed');
    }
    
  } catch (error) {
    console.error('❌ Error wrapping ETH:', error.message);
  }
}

wrapETH();