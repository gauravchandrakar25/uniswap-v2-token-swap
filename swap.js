require("dotenv").config();
const { ethers } = require("ethers");
const {
  ChainId,
  Token,
  WETH9,
  CurrencyAmount,
  TradeType,
} = require("@uniswap/sdk-core");
const { Pair, Route, Trade } = require("@uniswap/v2-sdk");
const uniswapV2poolABI = require("./uniswapV2poolABI.json");

const chainId = ChainId.MAINNET;
const tokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // must be checksummed
const decimals = 18;

const DAI = new Token(chainId, tokenAddress, decimals, "DAI", "Dai Stablecoin");
const USDC = new Token(
  chainId,
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  6,
  "USDC",
  "USDC Stablecoin"
);

// USDC Eth Sepolia 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
// DAI Sepolia 0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357
// WETH Sepolia 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
// Uniswap V2 Router sepolia 0x425141165d3DE9FEC831896C016617a52363b687

// USDC Mainnet 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

//provider
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!INFURA_API_KEY || !PRIVATE_KEY) {
  console.error("Missing INFURA_API_KEY or PRIVATE_KEY in .env file");
  process.exit(1);
}

// Initialize provider and wallet correctly
const provider = new ethers.providers.JsonRpcProvider(
  `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
);

const createPairUSDC = async () => {
  const pairAddress = Pair.getAddress(DAI, USDC);

  // Setup provider, import necessary ABI ...
  const pairContract = new ethers.Contract(
    pairAddress,
    uniswapV2poolABI,
    provider
  );
  const reserves = await pairContract["getReserves"]();
  const [reserve0, reserve1] = reserves;

  const tokens = [DAI, USDC];
  const [token0, token1] = tokens[0].sortsBefore(tokens[1])
    ? tokens
    : [tokens[1], tokens[0]];

  const pair = new Pair(
    CurrencyAmount.fromRawAmount(token0, reserve0),
    CurrencyAmount.fromRawAmount(token1, reserve1)
  );

  const route = new Route([pair], USDC, DAI);

  const amountIn = "1000000"; // 1 USDC

  const trade = new Trade(
    route,
    CurrencyAmount.fromRawAmount(USDC, amountIn),
    TradeType.EXACT_INPUT
  );

  console.log(
    "Current trading price 1 USDC to DAI",
    trade.executionPrice.toSignificant(6)
  );

  console.log("-".repeat(45));

  console.log(
    "One DAI to USDC Liquidity price --->",
    route.midPrice.toSignificant(6)
  ); // 1901.08
  console.log(
    "One USDC to DAI Liquidity price --->",
    route.midPrice.invert().toSignificant(6)
  );
  return pair;
};

createPairUSDC();
