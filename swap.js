require("dotenv").config();
const { ethers } = require("ethers");
const {
  ChainId,
  Token,
  WETH9,
  CurrencyAmount,
  TradeType,
  TokenAmount,
  Percent,
} = require("@uniswap/sdk-core");
const { Pair, Route, Trade, Fetcher } = require("@uniswap/v2-sdk");
const uniswapV2poolABI = require("./uniswapV2poolABI.json");
const uniswapV2RouterABI = require("./IUniswapV2Router02.json");
const usdcABI = require("./usdcABI.json");
const daiABI = require("./daiABI.json");

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

const UNISWAP_ROUTER_CONTRACT_ADDRESS =
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

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

  console.log("-".repeat(45));
  console.log("Liquidity for DAI --->", reserves[0] / 1000000000000000000);
  console.log("Liquidity for USDC --->", reserves[1] / 1000000);

  const tokens = [DAI, USDC];
  const [token0, token1] = tokens[0].sortsBefore(tokens[1])
    ? tokens
    : [tokens[1], tokens[0]];

  const pair = new Pair(
    CurrencyAmount.fromRawAmount(token0, reserve0),
    CurrencyAmount.fromRawAmount(token1, reserve1)
  );

  const route = new Route([pair], USDC, DAI);

  const amountInUSDC = "1000000"; // 1 USDC

  const tradeUSDCtoDAI = new Trade(
    route,
    CurrencyAmount.fromRawAmount(USDC, amountInUSDC),
    TradeType.EXACT_INPUT
  );

  console.log("-".repeat(45));

  console.log(
    "Current trading price 1 USDC to DAI",
    tradeUSDCtoDAI.executionPrice.toSignificant(6)
  );

  console.log(
    "Current trading price 1 DAI to USDC",
    tradeUSDCtoDAI.executionPrice.invert().toSignificant(6)
  );

  console.log("-".repeat(45));

  console.log(
    "One DAI to USDC Mid price --->",
    route.midPrice.toSignificant(6)
  ); // 1901.08
  console.log(
    "One USDC to DAI Mid price --->",
    route.midPrice.invert().toSignificant(6)
  );

  console.log("-".repeat(45));
  return pair;
};

const swaptoken = async () => {
  try {
    console.log("Token swap started");

    const pairAddress = Pair.getAddress(DAI, USDC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Setup provider, import necessary ABI ...
    const pairContract = new ethers.Contract(
      pairAddress,
      uniswapV2poolABI,
      provider
    );

    const reserves = await pairContract.getReserves();
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
    const signer = wallet.provider.getSigner(wallet.address);

    const amountIn = "1000000"; // 1 USDC

    const USDC_CONTRACT = new ethers.Contract(USDC.address, usdcABI, signer);
    const DAI_CONTRACT = new ethers.Contract(DAI.address, daiABI, signer);

    const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(
      UNISWAP_ROUTER_CONTRACT_ADDRESS,
      uniswapV2RouterABI,
      signer
    );

    const allowance = await USDC_CONTRACT.allowance(
      wallet.address,
      UNISWAP_ROUTER_CONTRACT_ADDRESS
    );
    if (allowance.lt(amountInMax)) {
      const tx = await USDC_CONTRACT.approve(
        UNISWAP_ROUTER_CONTRACT_ADDRESS,
        amountIn
      );
      await tx.wait();
    }

    const trade = new Trade(
      route,
      CurrencyAmount.fromRawAmount(USDC, amountIn),
      TradeType.EXACT_INPUT
    );

    const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact(); // needs to be converted to e.g. decimal string
    const amountOutMinBN = ethers.utils.parseUnits(amountOutMin, 18);

    const path = [USDC.address, DAI.address];
    const to = "0xeE649189671c873962cb729A300DD9855CB6ACc8"; // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time

    const rawTxn = await UNISWAP_ROUTER_CONTRACT.swapTokensForExactTokens(
      amountIn,
      amountOutMinBN,
      path,
      to,
      deadline
    );

    const sendTxn = await wallet.sendTransaction(rawTxn);

    const receipt = await sendTxn.wait();

    if (receipt) {
      console.log(
        " - Transaction is mined - \n" +
          "Transaction Hash: " +
          sendTxn.hash +
          "\n" +
          "Block Number: " +
          receipt.blockNumber +
          "\n" +
          sendTxn.hash +
          "to see your transaction"
      );
      console.log("-".repeat(45));
      console.log("Swapping successful");
    } else {
      console.log("Error submitting transaction");
    }
  } catch (error) {
    console.log("-".repeat(45));
    console.log("error", error);
    console.error("Error during token swap:", error.code);
    console.log("-".repeat(45));
  }
};

const callFunctions = async () => {
  await createPairUSDC();

  await swaptoken();
};

callFunctions();
