// Create this file as test-contract.js to test your contract
import 'dotenv/config.js';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const DAO_ABI = JSON.parse(readFileSync(new URL('./abi/DAOTreasuryWallet.json', import.meta.url)));

const provider = new ethers.JsonRpcProvider(process.env.RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const treasury = new ethers.Contract(process.env.TREASURY_ADDRESS, DAO_ABI, wallet);

async function testContract() {
  console.log('Testing contract...');
  
  // Test with 0.001 WETH -> USDC
  const testAmount = ethers.parseEther('0.001'); 
  
  try {
    const quote = await treasury.getSwapQuote(
      process.env.WETH_ADDRESS,
      process.env.USDC_ADDRESS,
      testAmount
    );
    
    console.log(`Quote for 0.001 WETH -> USDC: ${quote.toString()}`);
    console.log(`Quote in USDC: ${ethers.formatUnits(quote, 6)}`);
    
    if (quote.toString() === '0') {
      console.log('❌ Contract is still returning 0 - needs to be updated with Uniswap integration');
    } else {
      console.log('✅ Contract is working properly!');
    }
    
  } catch (error) {
    console.error('Error testing contract:', error);
  }
}

testContract().catch(console.error);