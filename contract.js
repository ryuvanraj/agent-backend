import { ethers } from 'ethers';
import 'dotenv/config.js';
import { readFileSync } from 'fs';

const DAO_ABI = JSON.parse(readFileSync(new URL('./abi/DAOTreasuryWallet.json', import.meta.url)));
const ERC20_ABI = JSON.parse(readFileSync(new URL('./abi/ERC20.json', import.meta.url)));

const provider = new ethers.JsonRpcProvider(process.env.RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const treasury = new ethers.Contract(process.env.TREASURY_ADDRESS, DAO_ABI, wallet);
const usdc = new ethers.Contract(process.env.USDC_ADDRESS, ERC20_ABI, provider);
const weth = new ethers.Contract(process.env.WETH_ADDRESS, ERC20_ABI, provider);

export async function getBalances() {
  const wethRaw = await weth.balanceOf(process.env.TREASURY_ADDRESS);
  const wethBalance = Number(ethers.formatEther(wethRaw));

  const usdcRaw = await usdc.balanceOf(process.env.TREASURY_ADDRESS);
  const usdcBalance = Number(ethers.formatUnits(usdcRaw, 6));

  return {
    weth: wethBalance,
    usdc: usdcBalance,
  };
}

export async function getSwapQuote(tokenIn, tokenOut, amountIn) {
  try {
    const quoteRaw = await treasury.getSwapQuote(tokenIn, tokenOut, amountIn);
    console.log(`[Quote] ${tokenIn} -> ${tokenOut}, input: ${amountIn}, quote: ${quoteRaw.toString()}`);
    return quoteRaw.toString();


  } catch (err) {
    console.error('Error fetching swap quote:', err);
    return '0';
  }
}

export async function rebalance(tokenIn, tokenOut, amountIn, minAmountOut, deadline) {
  const tx = await treasury.rebalance(tokenIn, tokenOut, amountIn, minAmountOut, deadline);
  console.log('Submitted rebalance tx:', tx.hash);
  await tx.wait();
  console.log('Rebalance tx confirmed');
}