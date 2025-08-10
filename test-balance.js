// test-balance.js - Quick test to check your balances
import { ethers } from 'ethers';
import 'dotenv/config.js';

async function testBalances() {
  console.log('🔍 Testing token balances...');
  
  const provider = new ethers.JsonRpcProvider(process.env.RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Wallet: ${wallet.address}`);
  console.log(`WETH Address: ${process.env.WETH_ADDRESS}`);
  console.log(`USDC Address: ${process.env.USDC_ADDRESS}`);
  
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];
  
  try {
    // Test USDC
    const usdcContract = new ethers.Contract(process.env.USDC_ADDRESS, ERC20_ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const usdcDecimals = await usdcContract.decimals();
    const usdcSymbol = await usdcContract.symbol();
    
    console.log(`\n✅ USDC (${usdcSymbol}):`);
    console.log(`   Raw balance: ${usdcBalance.toString()}`);
    console.log(`   Decimals: ${usdcDecimals}`);
    console.log(`   Formatted: ${ethers.formatUnits(usdcBalance, usdcDecimals)}`);
    
    // Test WETH
    const wethContract = new ethers.Contract(process.env.WETH_ADDRESS, ERC20_ABI, provider);
    const wethBalance = await wethContract.balanceOf(wallet.address);
    const wethDecimals = await wethContract.decimals();
    const wethSymbol = await wethContract.symbol();
    
    console.log(`\n✅ WETH (${wethSymbol}):`);
    console.log(`   Raw balance: ${wethBalance.toString()}`);
    console.log(`   Decimals: ${wethDecimals}`);
    console.log(`   Formatted: ${ethers.formatUnits(wethBalance, wethDecimals)}`);
    
    // Test ETH
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`\n✅ ETH:`);
    console.log(`   Raw balance: ${ethBalance.toString()}`);
    console.log(`   Formatted: ${ethers.formatEther(ethBalance)}`);
    
    // Test trade amounts
    console.log(`\n🧮 Trade Amount Calculations:`);
    if (BigInt(usdcBalance) > 0) {
      const usdcTradeAmount = BigInt(usdcBalance) * BigInt(50) / BigInt(100);
      console.log(`   50% USDC trade amount: ${ethers.formatUnits(usdcTradeAmount, usdcDecimals)}`);
    }
    
    if (BigInt(wethBalance) > 0) {
      const wethTradeAmount = BigInt(wethBalance) * BigInt(50) / BigInt(100);
      console.log(`   50% WETH trade amount: ${ethers.formatUnits(wethTradeAmount, wethDecimals)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBalances();