import { ethers } from 'ethers';

async function findPair() {
    // Try this free RPC instead
    const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Xu12Ba5Wg26ksW7wF-_11');
    
    const factoryAddress = "0xF62c03E08ada871A0bEb309762E260a7a6a880E6";
    const tokenA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
    const tokenB = "0x2CcA40f8594B09bC8c908888891098973D2fc1a4";
    
    const factoryABI = ["function getPair(address tokenA, address tokenB) external view returns (address pair)"];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, provider);
    const pairAddress = await factory.getPair(tokenA, tokenB);
    
    console.log("Existing pair address:", pairAddress);
}

findPair().catch(console.error);


