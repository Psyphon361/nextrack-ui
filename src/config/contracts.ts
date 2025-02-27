export const ELECTRONEUM_TESTNET_CONFIG = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID || '0x4F5E0C', // Electroneum testnet chain ID (5201420 in decimal)
  chainName: 'Electroneum Testnet',
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.ankr.com/electroneum_testnet/15266e093685caca47b9a524ba83c22259a0590c105a2b4c5c5b2a7c2d0c7f0c'],
  nativeCurrency: {
    name: 'ETN',
    symbol: 'ETN',
    decimals: 18,
  },
  blockExplorerUrls: [''], // Add block explorer URL if available
};

export const CONTRACT_ADDRESSES = {
  NEXTRACK: '0xCE4F858Fb32Ce77309519f4687836BcbA5Ad301d',
} as const;

export const CONTRACT_ABIS = {
  NEXTRACK: [
    {
      name: 'registerProductBatch',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'totalQuantity', type: 'uint256' },
        { name: 'unitPrice', type: 'uint256' },
        { name: 'ipfsUrl', type: 'string' }
      ],
      outputs: []
    },
    {
      name: 'listProductBatch',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'batchId', type: 'uint256' }],
      outputs: []
    },
    {
      name: 'delistProductBatch',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'batchId', type: 'uint256' }],
      outputs: []
    },
    {
      name: 'updateBatchUnitPrice',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'batchId', type: 'uint256' },
        { name: 'newUnitPrice', type: 'uint256' }
      ],
      outputs: []
    },
    {
      name: 'requestProductBatch',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'batchId', type: 'uint256' },
        { name: 'quantityRequested', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'uint256' }]
    },
    {
      name: 'approveTransfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'requestId', type: 'uint256' }],
      outputs: []
    },
    {
      name: 'rejectTransfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'requestId', type: 'uint256' }],
      outputs: []
    },
    {
      name: 'confirmTransfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'requestId', type: 'uint256' }],
      outputs: [
        { name: '', type: 'uint256' },
        { name: '', type: 'uint256' }
      ]
    },
    {
      name: 'onboardNewManufacturer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'manufacturer', type: 'address' }],
      outputs: []
    },
    {
      name: 'getCurrentInventory',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256[]' }]
    },
    {
      name: 'getAllBatchIds',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256[]' }]
    },
    {
      name: 'getRegisteredManufacturers',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'address[]' }]
    },
    {
      name: 'getManufacturerCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }]
    },
    {
      name: 'getBatchDetails',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'batchId', type: 'uint256' }],
      outputs: [
        { name: 'batchId', type: 'uint256' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'owner', type: 'address' },
        { name: 'totalQuantity', type: 'uint256' },
        { name: 'unitPrice', type: 'uint256' },
        { name: 'isListed', type: 'bool' },
        { name: 'parentBatch', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ]
    },
    {
      name: 'getTransferRequestDetails',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'requestId', type: 'uint256' }],
      outputs: [
        { name: 'requestId', type: 'uint256' },
        { name: 'batchId', type: 'uint256' },
        { name: 'seller', type: 'address' },
        { name: 'buyer', type: 'address' },
        { name: 'quantityRequested', type: 'uint256' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'timestamp', type: 'uint256' }
      ]
    },
    {
      name: 'getSellerTransferRequests',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'seller', type: 'address' }],
      outputs: [{ name: '', type: 'uint256[]' }]
    },
    {
      name: 'getBuyerTransferRequests',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'buyer', type: 'address' }],
      outputs: [{ name: '', type: 'uint256[]' }]
    },
    {
      name: 'getGovernanceTokenAddress',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'address' }]
    },
    {
      name: 'getVaultAddress',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'address' }]
    },
    {
      name: 'ProductBatchRegistered',
      type: 'event',
      inputs: [
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'owner', type: 'address', indexed: true },
        { name: 'totalQuantity', type: 'uint256' },
        { name: 'unitPrice', type: 'uint256' },
        { name: 'parentBatch', type: 'uint256', indexed: true },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'ProductBatchRequested',
      type: 'event',
      inputs: [
        { name: 'requestId', type: 'uint256', indexed: true },
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'seller', type: 'address', indexed: true },
        { name: 'buyer', type: 'address' },
        { name: 'quantityRequested', type: 'uint256' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'TransferApproved',
      type: 'event',
      inputs: [
        { name: 'requestId', type: 'uint256', indexed: true },
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'buyer', type: 'address', indexed: true },
        { name: 'quantity', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'TransferRejected',
      type: 'event',
      inputs: [
        { name: 'requestId', type: 'uint256', indexed: true },
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'buyer', type: 'address', indexed: true },
        { name: 'quantity', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'ProductBatchListed',
      type: 'event',
      inputs: [
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'owner', type: 'address', indexed: true },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'totalQuantity', type: 'uint256' },
        { name: 'unitPrice', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'ProductBatchDelisted',
      type: 'event',
      inputs: [
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'owner', type: 'address', indexed: true },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'totalQuantity', type: 'uint256' },
        { name: 'unitPrice', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'ProductBatchUnitPriceUpdated',
      type: 'event',
      inputs: [
        { name: 'batchId', type: 'uint256', indexed: true },
        { name: 'owner', type: 'address', indexed: true },
        { name: 'oldUnitPrice', type: 'uint256' },
        { name: 'newUnitPrice', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'NewManufacturerOnboarded',
      type: 'event',
      inputs: [{ name: 'manufacturer', type: 'address', indexed: true }],
      anonymous: false
    },
    {
      name: 'RequestCompleted',
      type: 'event',
      inputs: [
        { name: 'requestId', type: 'uint256', indexed: true },
        { name: 'buyer', type: 'address', indexed: true },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    },
    {
      name: 'ReceivedAndCreatedBatch',
      type: 'event',
      inputs: [
        { name: 'requestId', type: 'uint256', indexed: true },
        { name: 'newBatchId', type: 'uint256', indexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'uint8' },
        { name: 'owner', type: 'address', indexed: true },
        { name: 'totalQuantity', type: 'uint256' },
        { name: 'unitPrice', type: 'uint256' },
        { name: 'parentBatch', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ],
      anonymous: false
    }
  ]
} as const;
