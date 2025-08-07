import axios from 'axios';

let cachedEthPrice = 0;
let lastFetchTimestamp = 0;
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

 export async function getEthUsdPrice() {
  const now = Date.now();
  if (now - lastFetchTimestamp < CACHE_TIME && cachedEthPrice > 0) {
    return cachedEthPrice; // Return cached price
  }
  try {
    const resp = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: 'ethereum', vs_currencies: 'usd' },
    });
    cachedEthPrice = resp.data.ethereum.usd;
    lastFetchTimestamp = Date.now();
    return cachedEthPrice;
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.warn('API rate limit hit - using cached price');
      return cachedEthPrice || 0;
    }
    console.error('Error fetching ETH price:', err);
    return cachedEthPrice || 0;
  }
}

export async function getExternalQuote(fromSymbol, toSymbol, amount) {
  const ethUsd = await getEthUsdPrice();

  if (fromSymbol === 'ETH' && toSymbol === 'USDC') {
    return amount * ethUsd; // ETH -> USDC
  }
  if (fromSymbol === 'USDC' && toSymbol === 'ETH') {
    if (ethUsd === 0) return 0;
    return amount / ethUsd; // USDC -> ETH
  }
  return 0;
}