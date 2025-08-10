import 'dotenv/config.js';
import OffChainArbitrageBot from './src/offChainArbitrageBot.js';

async function main() {
  console.log('🚀 Starting Off-Chain Arbitrage Bot...');
  console.log('📊 Using DEX APIs: 1inch, 0x, ParaSwap');
  console.log('💰 Minimum profit required: $' + (process.env.MIN_PROFIT_USD || '15'));
  console.log('⚡ Max slippage: ' + ((process.env.MAX_SLIPPAGE || '0.005') * 100) + '%');
  
  try {
    const bot = new OffChainArbitrageBot();
    await bot.runArbitrageLoop();
  } catch (error) {
    console.error('❌ Bot crashed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down arbitrage bot...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

main();