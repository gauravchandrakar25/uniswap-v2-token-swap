require("dotenv").config();
const { ethers } = require("ethers");
const { ChainId, Token, Fetcher, Route } = require("@uniswap/sdk");
const {
  abi: routerAbi,
} = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const provider = new ethers.providers.InfuraProvider("sepolia", INFURA_API_KEY);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const DAI = new Token(
  ChainId.SEPOLIA,
  "0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6",
  18,
  "DAI",
  "Dai Stablecoin"
);
const USDC = new Token(
  ChainId.SEPOLIA,
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  6,
  "USDC",
  "USD Coin"
);
const ROUTER_ADDRESS = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Uniswap V2 Router address

const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, wallet);

async function getPairInfo() {
  const pair = await Fetcher.fetchPairData(DAI, USDC, provider);
  const route = new Route([pair], DAI);

  console.log(`DAI/USDC Mid Price: ${route.midPrice.toSignificant(6)}`);
  console.log(
    `USDC/DAI Mid Price: ${route.midPrice.invert().toSignificant(6)}`
  );
}
