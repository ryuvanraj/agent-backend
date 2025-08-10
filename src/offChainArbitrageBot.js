import axios from 'axios';
import { ethers } from 'ethers';
import 'dotenv/config.js';

export class OffChainArbitrageBot {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    
    // Trading configuration
    this.config = {
      minProfitUSD: parseFloat(process.env.MIN_PROFIT_USD || '5'),
      maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.01'), // 1%
      gasMultiplier: 1.3, // 30% gas buffer
      maxGasPrice: ethers.parseUnits('30', 'gwei'), // Max 30 gwei
      checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '15000'), // Check every 15 seconds
      walletAddress: this.wallet.address,
      isTestnet: true, // Sepolia testnet flag
      chainId: 11155111 // Sepolia chain ID
    };

    this.initializeBot();
  }

  initializeBot() {
    console.log(`🚀 Starting Off-Chain Arbitrage Bot (Sepolia Testnet)...`);
    console.log(`📊 Using DEX APIs: Mock-ParaSwap (Testnet Simulation)`);
    console.log(`💰 Minimum profit required: $${this.config.minProfitUSD}`);
    console.log(`⚡ Max slippage: ${(this.config.maxSlippage * 100).toFixed(1)}%`);
    console.log(`🤖 Bot initialized for wallet: ${this.config.walletAddress}`);
    console.log(`🌐 Network: Sepolia Testnet (Chain ID: ${this.config.chainId})`);
    console.log('🎭 Note: Using mock quotes for testnet - prices simulated for testing');
    console.log('💡 Perfect for testing arbitrage logic without real DEX calls!');
  }

  // ===== MOCK QUOTE SYSTEM FOR TESTNET =====
  async getMockQuote(srcToken, destToken, srcAmount, provider = 'mock') {
    try {
      console.log(`🎭 Creating mock quote from ${provider}...`);
      
      // Get current "prices" (mock prices for testnet)
      const ethPrice = await this.getEthPrice(); // $3000 fallback
      const srcSymbol = this.getTokenSymbol(srcToken);
      const destSymbol = this.getTokenSymbol(destToken);
      
      let exchangeRate;
      let toAmount;
      
      if (srcSymbol === 'WETH' && destSymbol === 'USDC') {
        // WETH -> USDC: 1 WETH = ~3000 USDC (with realistic spread)
        const spread = 0.997 + (Math.random() * 0.006); // 0.3% to 0.9% spread
        exchangeRate = ethPrice * spread;
        const srcAmountFormatted = Number(srcAmount) / 1e18;
        toAmount = BigInt(Math.floor(srcAmountFormatted * exchangeRate * 1e6));
      } else if (srcSymbol === 'USDC' && destSymbol === 'WETH') {
        // USDC -> WETH: 3000 USDC = ~1 WETH (with realistic spread)
        const spread = 0.997 + (Math.random() * 0.006); // 0.3% to 0.9% spread
        exchangeRate = (1 / ethPrice) * spread;
        const srcAmountFormatted = Number(srcAmount) / 1e6;
        toAmount = BigInt(Math.floor(srcAmountFormatted * exchangeRate * 1e18));
      } else {
        console.log('❌ Unsupported trading pair for mock quote');
        return null;
      }

      // Add some randomness to simulate market fluctuations
      const marketVolatility = 0.995 + (Math.random() * 0.01); // ±0.5% random variation
      toAmount = BigInt(Math.floor(Number(toAmount) * marketVolatility));

      // Mock transaction data
      const mockTx = {
        to: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Mock 1inch router
        data: '0x12aa3caf000000000000000000000000' + srcToken.slice(2), // Mock function selector + token
        value: '0',
        gasLimit: BigInt(180000 + Math.floor(Math.random() * 40000)) // Random gas between 180k-220k
      };

      const rate = srcSymbol === 'USDC' 
        ? (Number(toAmount) / 1e18) / (Number(srcAmount) / 1e6)
        : (Number(toAmount) / 1e6) / (Number(srcAmount) / 1e18);
      
      console.log(`   📈 Rate: 1 ${srcSymbol} = ${rate.toFixed(6)} ${destSymbol}`);
      console.log(`   💰 Output: ${this.formatAmount(toAmount, destToken)} ${destSymbol}`);

      return {
        provider: `${provider}-mock`,
        fromAmount: srcAmount.toString(),
        toAmount: toAmount.toString(),
        estimatedGas: Number(mockTx.gasLimit),
        tx: mockTx
      };

    } catch (error) {
      console.error('❌ Mock quote error:', error.message);
      return null;
    }
  }

  // ===== PRICE COMPARISON & ARBITRAGE LOGIC =====
  async findBestRate(fromToken, toToken, amount) {
    console.log(`🔍 Comparing rates for ${this.formatAmount(amount, fromToken)} ${this.getTokenSymbol(fromToken)} -> ${this.getTokenSymbol(toToken)}`);

    // For testnet, we'll create multiple mock quotes to simulate comparison
    const mockProviders = ['paraswap', 'uniswap', '1inch'];
    const quotePromises = mockProviders.map(provider => 
      this.getMockQuote(fromToken, toToken, amount, provider)
    );

    const results = await Promise.allSettled(quotePromises);
    const validQuotes = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

    if (validQuotes.length === 0) {
      console.log('❌ No valid quotes received');
      return null;
    }

    // Find best rate (highest output)
    const bestQuote = validQuotes.reduce((best, current) => {
      const currentOutput = BigInt(current.toAmount);
      const bestOutput = BigInt(best.toAmount);
      return currentOutput > bestOutput ? current : best;
    });

    // Log comparison
    console.log('📊 Quote comparison:');
    validQuotes.forEach(quote => {
      const output = this.formatAmount(quote.toAmount, toToken);
      const symbol = this.getTokenSymbol(toToken);
      const isBest = quote === bestQuote ? '👑' : '  ';
      console.log(`${isBest} ${quote.provider.padEnd(15)}: ${output} ${symbol}`);
    });

    return bestQuote;
  }

  async checkArbitrageOpportunity(tokenA, tokenB, amount) {
    // Get current balances
    const balances = await this.getTokenBalances();
    
    if (!this.hasSufficientBalance(tokenA, amount, balances)) {
      return null;
    }

    // Get best rate for A -> B
    const bestQuoteAB = await this.findBestRate(tokenA, tokenB, amount);
    if (!bestQuoteAB) return null;

    // Calculate potential profit in USD
    const inputValueUSD = await this.getTokenValueUSD(tokenA, amount);
    const outputValueUSD = await this.getTokenValueUSD(tokenB, bestQuoteAB.toAmount);
    const grossProfitUSD = outputValueUSD - inputValueUSD;

    // Estimate gas cost
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    const gasCostETH = gasPrice * BigInt(bestQuoteAB.estimatedGas || 200000) * BigInt(Math.floor(this.config.gasMultiplier * 100)) / BigInt(100);
    const gasCostUSD = await this.getTokenValueUSD(process.env.WETH_ADDRESS, gasCostETH);

    const netProfitUSD = grossProfitUSD - gasCostUSD;
    const profitPercentage = inputValueUSD > 0 ? (netProfitUSD / inputValueUSD) * 100 : 0;

    const opportunity = {
      fromToken: tokenA,
      toToken: tokenB,
      fromAmount: amount.toString(),
      toAmount: bestQuoteAB.toAmount,
      provider: bestQuoteAB.provider,
      grossProfitUSD,
      gasCostUSD,
      netProfitUSD,
      profitPercentage,
      isProfitable: netProfitUSD >= this.config.minProfitUSD,
      quote: bestQuoteAB,
      gasPrice: gasPrice.toString()
    };

    return opportunity;
  }

  // ===== EXECUTION =====
  async executeArbitrage(opportunity) {
    if (!opportunity.isProfitable) {
      console.log('❌ Opportunity not profitable enough');
      return false;
    }

    console.log(`\n🚀 EXECUTING MOCK ARBITRAGE (TESTNET)`);
    console.log(`💰 Expected profit: $${opportunity.netProfitUSD.toFixed(2)} (${opportunity.profitPercentage.toFixed(2)}%)`);
    console.log(`🔄 Provider: ${opportunity.provider}`);
    console.log(`⛽ Gas cost: $${opportunity.gasCostUSD.toFixed(2)}`);
    console.log(`🎭 NOTE: This is a simulation - no real transaction executed`);

    try {
      const swapTx = opportunity.quote.tx;

      if (!swapTx) {
        console.log('❌ Failed to get swap transaction data');
        return false;
      }

      // Build transaction
      const tx = {
        to: swapTx.to,
        data: swapTx.data,
        value: swapTx.value || '0',
        gasLimit: swapTx.gasLimit,
        gasPrice: BigInt(opportunity.gasPrice)
      };

      // TESTNET SIMULATION: Log transaction details
      console.log('📋 Mock Transaction details:');
      console.log(`   To: ${tx.to}`);
      console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
      console.log(`   Gas: ${tx.gasLimit.toString()}`);

      // Simulate successful execution
      console.log('✅ Mock arbitrage executed successfully on testnet!');
      console.log(`🏆 Simulated profit: $${opportunity.netProfitUSD.toFixed(2)}`);
      console.log(`⛽ Estimated gas: ${tx.gasLimit.toString()}`);
      console.log(`🎉 Ready for mainnet with real API keys!`);
      
      return true;

    } catch (error) {
      console.error('❌ Simulation error:', error.message);
      return false;
    }
  }

  // ===== UTILITY FUNCTIONS =====
  async getTokenBalances() {
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    
    try {
      const wethContract = new ethers.Contract(process.env.WETH_ADDRESS, ERC20_ABI, this.provider);
      const usdcContract = new ethers.Contract(process.env.USDC_ADDRESS, ERC20_ABI, this.provider);

      const [wethBalance, usdcBalance, ethBalance] = await Promise.all([
        wethContract.balanceOf(this.config.walletAddress).catch(() => BigInt(0)),
        usdcContract.balanceOf(this.config.walletAddress).catch(() => BigInt(0)),
        this.provider.getBalance(this.config.walletAddress)
      ]);

      return {
        [process.env.WETH_ADDRESS]: wethBalance,
        [process.env.USDC_ADDRESS]: usdcBalance,
        ETH: ethBalance
      };
    } catch (error) {
      console.error('❌ Error getting balances:', error.message);
      return {
        [process.env.WETH_ADDRESS]: BigInt(0),
        [process.env.USDC_ADDRESS]: BigInt(0),
        ETH: BigInt(0)
      };
    }
  }

  hasSufficientBalance(token, amount, balances) {
    const balance = balances[token];
    if (!balance) return false;
    
    const hasBalance = BigInt(balance) >= BigInt(amount);
    
    // Debug log
    if (!hasBalance) {
      console.log(`🔍 Balance check failed:`);
      console.log(`   Token: ${this.getTokenSymbol(token)}`);
      console.log(`   Required: ${this.formatAmount(amount, token)}`);
      console.log(`   Available: ${this.formatAmount(balance, token)}`);
    }
    
    return hasBalance;
  }

  async getTokenValueUSD(tokenAddress, amount) {
    // Testnet mock prices
    const ethPrice = await this.getEthPrice();
    
    if (tokenAddress === process.env.WETH_ADDRESS) {
      return (Number(amount) / 1e18) * ethPrice;
    } else if (tokenAddress === process.env.USDC_ADDRESS) {
      return Number(amount) / 1e6; // USDC = $1
    }
    return 0;
  }

  async getEthPrice() {
    try {
      // Try to get real ETH price, but fallback to testnet mock price
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
        timeout: 3000
      });
      return response.data.ethereum.usd;
    } catch (error) {
      // Testnet fallback price
      console.log('📊 Using mock ETH price for testnet: $3000');
      return 3000;
    }
  }

  formatAmount(amount, tokenAddress) {
    const decimals = tokenAddress === process.env.USDC_ADDRESS ? 6 : 18;
    return (Number(amount) / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 6);
  }

  getTokenSymbol(tokenAddress) {
    if (tokenAddress === process.env.WETH_ADDRESS) return 'WETH';
    if (tokenAddress === process.env.USDC_ADDRESS) return 'USDC';
    return 'UNKNOWN';
  }

  // ===== MAIN LOOP =====
  async runArbitrageLoop() {
    console.log('🔄 Starting arbitrage monitoring on Sepolia testnet...\n');
    
    const WETH_ADDRESS = process.env.WETH_ADDRESS;
    const USDC_ADDRESS = process.env.USDC_ADDRESS;
    
    const tradePairs = [
      { from: WETH_ADDRESS, to: USDC_ADDRESS },
      { from: USDC_ADDRESS, to: WETH_ADDRESS }
    ];

    while (true) {
      try {
        console.log(`⏰ ${new Date().toLocaleTimeString()} - Checking opportunities...`);
        
        const balances = await this.getTokenBalances();
        console.log(`💼 Balances: ${this.formatAmount(balances[WETH_ADDRESS] || BigInt(0), WETH_ADDRESS)} WETH, ${this.formatAmount(balances[USDC_ADDRESS] || BigInt(0), USDC_ADDRESS)} USDC, ${ethers.formatEther(balances.ETH)} ETH\n`);

        for (const pair of tradePairs) {
          const balance = balances[pair.from];
          const tokenSymbol = this.getTokenSymbol(pair.from);
          
          // Set minimum balance thresholds based on token type
          const minThreshold = tokenSymbol === 'USDC' ? BigInt(1e6) : BigInt(1e15); // 1 USDC or 0.001 WETH
          
          if (!balance || BigInt(balance) < minThreshold) {
            console.log(`⚠️  Insufficient ${tokenSymbol} balance: ${this.formatAmount(balance || BigInt(0), pair.from)} (min: ${this.formatAmount(minThreshold, pair.from)})`);
            continue;
          }

          // Use 50% of balance for arbitrage (safer for testnet)
          const tradeAmount = BigInt(balance) * BigInt(50) / BigInt(100);
          console.log(`💱 Attempting to trade ${this.formatAmount(tradeAmount, pair.from)} ${tokenSymbol}`);
          
          const opportunity = await this.checkArbitrageOpportunity(pair.from, pair.to, tradeAmount);
          
          if (opportunity) {
            console.log(`💡 Opportunity found: $${opportunity.netProfitUSD.toFixed(2)} profit (${opportunity.profitPercentage.toFixed(2)}%)`);
            
            if (opportunity.isProfitable) {
              console.log('🎯 Profitable opportunity detected!');
              // Execute mock arbitrage
              await this.executeArbitrage(opportunity);
            } else {
              console.log(`❌ Not profitable enough. Required: $${this.config.minProfitUSD}, Found: $${opportunity.netProfitUSD.toFixed(2)}`);
            }
          } else {
            console.log(`❌ No opportunity for ${this.getTokenSymbol(pair.from)} -> ${this.getTokenSymbol(pair.to)}`);
          }
          
          console.log(''); // Empty line for readability
          // Small delay between pair checks
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error('❌ Loop error:', error.message);
      }

      // Wait before next check
      console.log(`💤 Waiting ${this.config.checkIntervalMs/1000}s for next check...\n${'='.repeat(50)}\n`);
      await new Promise(resolve => setTimeout(resolve, this.config.checkIntervalMs));
    }
  }
}

// Export for use in main file
export default OffChainArbitrageBot;