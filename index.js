import 'dotenv/config.js';
import { ethers } from 'ethers';
import { getBalances, getSwapQuote, rebalance } from './contract.js';
import { getExternalQuote } from './dexQuote.js';
import { willBeProfitable } from './profitLogic.js';
import { logSwapEvent, sleep } from './utils.js';

const WETH_ADDRESS = process.env.WETH_ADDRESS;
const USDC_ADDRESS = process.env.USDC_ADDRESS;
const MIN_PROFIT = parseFloat(process.env.AGENT_MIN_PROFIT ?? 0.3);

const MAIN_PAIRS = [
  { in: WETH_ADDRESS, out: USDC_ADDRESS }, // WETH -> USDC
  { in: USDC_ADDRESS, out: WETH_ADDRESS }, // USDC -> WETH
];

async function agentLoop() {
  const balances = await getBalances();
  console.log(`[Balances] WETH: ${balances.weth.toFixed(6)}, USDC: ${balances.usdc}`);

  for (const pair of MAIN_PAIRS) {
    const balanceIn = pair.in === WETH_ADDRESS ? balances.weth : balances.usdc;
    if (balanceIn < 0.005) continue; // Skip if too small to trade

    let amountIn, amountInContract;
    if (pair.in === WETH_ADDRESS) {
      amountIn = balanceIn - 0.003; // Leave gas reserve
      if (amountIn <= 0) continue;
      amountInContract = ethers.parseEther(amountIn.toFixed(6));
    } else {
      amountIn = balanceIn;
      amountInContract = BigInt(Math.floor(amountIn * 1e6));
    }

    const onChainQuoteRaw = await getSwapQuote(pair.in, pair.out, amountInContract.toString());

    const extQuote = await getExternalQuote(
      pair.in === WETH_ADDRESS ? 'ETH' : 'USDC',
      pair.out === WETH_ADDRESS ? 'ETH' : 'USDC',
      amountIn
    );

    const profitInfo = await willBeProfitable(balances, pair, onChainQuoteRaw, extQuote, amountIn);

    if (profitInfo.improvesRatio && profitInfo.profitPct > MIN_PROFIT) {
      console.log(`Profitable swap found: ${pair.in} -> ${pair.out}, profit: $${profitInfo.profit.toFixed(2)} (${profitInfo.profitPct.toFixed(4)}%)`);
      const minAmountOut = BigInt(Math.floor(Number(onChainQuoteRaw) * 0.995));
      const deadline = Math.floor(Date.now() / 1000) + 300;

      try {
        await rebalance(pair.in, pair.out, amountInContract.toString(), minAmountOut.toString(), deadline);
        logSwapEvent(pair, amountIn, onChainQuoteRaw, profitInfo);
      } catch (err) {
        console.error('Swap execution failed:', err);
      }
    } else {
      console.log(`No profitable swap for ${pair.in} -> ${pair.out}`);
    }
  }
}

(async () => {
  console.log('[Agent] Starting treasury rebalancer...');
  while (true) {
    await agentLoop();
    await sleep(60000);
  }
})();
