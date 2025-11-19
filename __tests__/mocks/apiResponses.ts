/**
 * Mock API responses for testing
 */

export const mockMarket = {
  id: 12345,
  title: "Will Bitcoin reach $100k by end of 2024?",
  description: "This market resolves to YES if Bitcoin (BTC) reaches $100,000 USD...",
  status: "ACTIVE",
  topic_type: "BINARY",
  condition_id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  question_id: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  collateral_token: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
  outcomes: [
    {
      id: 1,
      name: "YES",
      token_id: "token_yes_123",
      index: 1,
      price: "0.55",
    },
    {
      id: 2,
      name: "NO",
      token_id: "token_no_123",
      index: 2,
      price: "0.45",
    },
  ],
  created_at: 1234567890,
  end_at: 1735689600,
  resolved_at: null,
  resolution: null,
};

export const mockCategoricalMarket = {
  id: 67890,
  title: "Who will win the 2024 US Presidential Election?",
  status: "ACTIVE",
  topic_type: "CATEGORICAL",
  condition_id: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
  outcomes: [
    { id: 1, name: "Democrat", token_id: "token_dem", index: 1, price: "0.52" },
    { id: 2, name: "Republican", token_id: "token_rep", index: 2, price: "0.45" },
    { id: 3, name: "Other", token_id: "token_other", index: 3, price: "0.03" },
  ],
};

export const mockOrderbook = {
  token_id: "token_yes_123",
  bids: [
    { price: "0.54", amount: "1000.50" },
    { price: "0.53", amount: "2500.00" },
    { price: "0.52", amount: "5000.25" },
  ],
  asks: [
    { price: "0.55", amount: "1500.00" },
    { price: "0.56", amount: "3000.75" },
    { price: "0.57", amount: "4500.00" },
  ],
  last_price: "0.545",
  last_updated: 1234567890,
};

export const mockQuoteTokens = [
  {
    address: "0x55d398326f99059fF775485246999027B3197955",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    chain_id: 56,
  },
  {
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    chain_id: 56,
  },
];

export const mockOrder = {
  order_id: "order_123456",
  market_id: 12345,
  token_id: "token_yes_123",
  side: "BUY",
  order_type: "LIMIT_ORDER",
  price: "0.55",
  original_amount: "100.00",
  filled_amount: "25.50",
  remaining_amount: "74.50",
  status: "OPEN",
  created_at: 1234567890,
  updated_at: 1234567900,
  maker: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
};

export const mockTrade = {
  trade_id: "trade_789",
  order_id: "order_123456",
  market_id: 12345,
  token_id: "token_yes_123",
  side: "BUY",
  price: "0.55",
  amount: "25.50",
  fee: "0.051",
  timestamp: 1234567890,
  maker: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  taker: "0x9876543210fedcba9876543210fedcba98765432",
};

export const mockBalance = {
  token_address: "0x55d398326f99059fF775485246999027B3197955",
  symbol: "USDT",
  balance: "1000.500000",
  available: "950.250000",
  locked: "50.250000",
};

export const mockPosition = {
  market_id: 12345,
  outcome_id: 1,
  outcome_name: "YES",
  token_id: "token_yes_123",
  amount: "150.75",
  average_price: "0.52",
  current_price: "0.55",
  pnl: "4.52",
  pnl_percentage: "5.79",
};

export const mockPriceHistory = {
  token_id: "token_yes_123",
  interval: "1h",
  data: [
    { timestamp: 1234567800, open: "0.50", high: "0.52", low: "0.49", close: "0.51", volume: "1000" },
    { timestamp: 1234571400, open: "0.51", high: "0.53", low: "0.50", close: "0.52", volume: "1500" },
    { timestamp: 1234575000, open: "0.52", high: "0.55", low: "0.51", close: "0.54", volume: "2000" },
    { timestamp: 1234578600, open: "0.54", high: "0.56", low: "0.53", close: "0.55", volume: "1800" },
  ],
};

export const mockFeeRates = {
  token_id: "token_yes_123",
  maker_fee_rate: "0.002", // 0.2%
  taker_fee_rate: "0.002", // 0.2%
};

export const mockUserAuth = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  api_key: "test_api_key_123",
  created_at: 1234567890,
  permissions: ["trade", "read"],
};

// API response wrappers
export const wrapApiResponse = <T>(data: T) => ({
  code: 0,
  message: "success",
  result: {
    data,
  },
});

export const wrapApiListResponse = <T>(list: T[], total: number = 0) => ({
  code: 0,
  message: "success",
  result: {
    list,
    total: total || list.length,
  },
});

export const wrapApiError = (message: string, code: number = 1) => ({
  code,
  message,
  result: null,
});
