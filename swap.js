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

const createPair = async () => {
  const pairAddress = Pair.getAddress(DAI, WETH9[DAI.chainId]);

  // Setup provider, import necessary ABI ...
  const pairContract = new ethers.Contract(
    pairAddress,
    uniswapV2poolABI,
    provider
  );
  const reserves = await pairContract["getReserves"]();
  const [reserve0, reserve1] = reserves;

  const tokens = [DAI, WETH9[DAI.chainId]];
  const [token0, token1] = tokens[0].sortsBefore(tokens[1])
    ? tokens
    : [tokens[1], tokens[0]];

  const pair = new Pair(
    CurrencyAmount.fromRawAmount(token0, reserve0),
    CurrencyAmount.fromRawAmount(token1, reserve1)
  );

  const route = new Route([pair], WETH9[DAI.chainId], DAI);

  const amountIn = "1000000000000000000"; // 1 WETH

  const trade = new Trade(
    route,
    CurrencyAmount.fromRawAmount(WETH9[DAI.chainId], amountIn),
    TradeType.EXACT_INPUT
  );

  console.log(
    "Execution price of trading 1 WETH for DAI",
    trade.executionPrice.toSignificant(6)
  );

  console.log(
    "One WETH to DAI Mid Price --->",
    route.midPrice.toSignificant(6)
  ); // 1901.08
  console.log(
    "One dai to WETH Mid Price --->",
    route.midPrice.invert().toSignificant(6)
  );
  return pair;
};

createPair();
