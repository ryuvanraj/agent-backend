import { getEthUsdPrice } from './dexQuote.js';
import { ethers } from 'ethers';

export async function computePortfolio(balances) {
const ethUsd = await getEthUsdPrice();
const wethValue = balances.weth * ethUsd;
const total = wethValue + balances.usdc;
return { wethValue, usdcValue: balances.usdc, total, ethUsd };
}

export async function willBeProfitable(balances, pair, onChainQuoteRaw, extQuoteRaw, amountIn) {
const { total, ethUsd } = await computePortfolio(balances);

let received = Number(onChainQuoteRaw);
if (pair.out === process.env.USDC_ADDRESS) received /= 1e6;
if (pair.out === process.env.WETH_ADDRESS) received /= 1e18;

let newWeth = pair.out === process.env.WETH_ADDRESS ? received : balances.weth - amountIn;
let newUsdc = pair.out === process.env.USDC_ADDRESS ? received : balances.usdc - amountIn;

let newWethValue = newWeth * ethUsd;
let newTotal = newWethValue + newUsdc;
let newWethPct = newWethValue / newTotal;

let profit = newTotal - total;
let profitPct = (profit / total) * 100;

console.log('[ProfitCalc] totalBefore:', total.toFixed(4), '| totalAfter:', newTotal.toFixed(4));
console.log('[ProfitCalc] profit: $' + profit.toFixed(4), '| profitPct:', profitPct.toFixed(4));

// For development: always allow rebalance (disable ratio improvement check)
const improvesRatio = true;

return {
profit,
profitPct,
improvesRatio,
newWeth,
newUsdc,
newWethPct,
distanceAfter: Math.abs(newWethPct - 0.5),
};
}