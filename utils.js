export function logSwapEvent(pair, amountIn, amountOut, profitInfo) {
  console.log(`\n[SWAP EXECUTED]`);
  console.log(`  Swap: ${pair.in} -> ${pair.out}`);
  console.log(`  Amount In: ${amountIn}`);
  console.log(`  Amount Out (raw): ${amountOut}`);
  console.log(`  Profit: $${profitInfo.profit.toFixed(2)} (${profitInfo.profitPct.toFixed(4)}%)`);
  console.log(`  Improved ratio towards 50/50: ${profitInfo.improvesRatio ? 'YES' : 'NO'}`);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}