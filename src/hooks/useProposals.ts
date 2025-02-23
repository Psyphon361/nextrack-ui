import { useEffect, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { ProposalState } from '@/types/dao';

const GOVERNOR_ADDRESS = '0xD384A3471F1c22b9b578f2fc35d8Ca854AEb6801';
const RPC_URL = 'https://rpc.ankr.com/electroneum_testnet/15266e093685caca47b9a524ba83c22259a0590c105a2b4c5c5b2a7c2d0c7f0c';
const BLOCK_TIME = 5; // Electroneum block time in seconds
const DEBOUNCE_TIME = 2000; // 2 seconds debounce for refreshing

export interface Proposal {
  id: string;
  proposer: string;
  description: string;
  manufacturerAddress: string;
  voteStart: Date;
  voteEnd: Date;
  state: ProposalState;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  targets: `0x${string}`[];
  values: bigint[];
  calldatas: `0x${string}`[];
}

// Define the ABI for the events and functions we need
const governorABI = [
  {
    "type": "event",
    "name": "ProposalCreated",
    "inputs": [
      {
        "type": "uint256",
        "name": "proposalId",
        "indexed": false
      },
      {
        "type": "address",
        "name": "proposer",
        "indexed": false
      },
      {
        "type": "address[]",
        "name": "targets",
        "indexed": false
      },
      {
        "type": "uint256[]",
        "name": "values",
        "indexed": false
      },
      {
        "type": "string[]",
        "name": "signatures",
        "indexed": false
      },
      {
        "type": "bytes[]",
        "name": "calldatas",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "startBlock",
        "indexed": false
      },
      {
        "type": "uint256",
        "name": "endBlock",
        "indexed": false
      },
      {
        "type": "string",
        "name": "description",
        "indexed": false
      }
    ]
  },
  {
    "type": "function",
    "name": "state",
    "inputs": [{ "type": "uint256", "name": "proposalId" }],
    "outputs": [{ "type": "uint8" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "proposalVotes",
    "inputs": [{ "type": "uint256", "name": "proposalId" }],
    "outputs": [
      { "type": "uint256", "name": "againstVotes" },
      { "type": "uint256", "name": "forVotes" },
      { "type": "uint256", "name": "abstainVotes" }
    ],
    "stateMutability": "view"
  }
] as const;

// Helper function to extract manufacturer address from calldata
const extractManufacturerAddress = (calldata: string): string => {
  // Get the last 40 characters (20 bytes) of the calldata, excluding '0x'
  const address = '0x' + calldata.slice(-40);
  return address.toLowerCase();
};

// Helper function to calculate vote timing
const calculateVoteTiming = async (provider: ethers.Provider, startBlock: bigint, endBlock: bigint) => {
  const currentBlock = await provider.getBlockNumber();
  const currentBlockBigInt = BigInt(currentBlock);

  const now = Date.now();

  // Calculate seconds until start and end relative to current block
  const blocksUntilStart = startBlock - currentBlockBigInt;
  const blocksUntilEnd = endBlock - currentBlockBigInt;

  const secondsUntilStart = Number(blocksUntilStart) * BLOCK_TIME;
  const secondsUntilEnd = Number(blocksUntilEnd) * BLOCK_TIME;

  console.log('Vote timing calculation:', {
    currentBlock,
    startBlock: startBlock.toString(),
    endBlock: endBlock.toString(),
    blocksUntilStart: blocksUntilStart.toString(),
    blocksUntilEnd: blocksUntilEnd.toString(),
    secondsUntilStart,
    secondsUntilEnd
  });

  return {
    voteStart: new Date(now + secondsUntilStart * 1000),
    voteEnd: new Date(now + secondsUntilEnd * 1000)
  };
};

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isFetchingRef = useRef(false);

  const fetchProposals = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('Already fetching proposals, skipping...');
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('Setting up ethers provider and contract...');
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(GOVERNOR_ADDRESS, governorABI, provider);

      const filter = contract.filters.ProposalCreated();
      const events = await contract.queryFilter(filter);

      const proposalPromises = events.map(async (event: any) => {
        const args = event.args;
        if (!args) return null;

        try {
          const proposalId = args.proposalId.toString();
          const manufacturerAddress = extractManufacturerAddress(args.calldatas[0]);

          const { voteStart, voteEnd } = await calculateVoteTiming(
            provider,
            BigInt(args.startBlock),
            BigInt(args.endBlock)
          );

          const state = await contract.state(proposalId);
          const votes = await contract.proposalVotes(proposalId);

          // Handle values from ethers event
          let values: bigint[] = [];
          try {
            // First try to get raw values
            const rawValues = args.values;

            // If it's an array-like object, convert it to array
            const valueArray = Array.from(rawValues);

            // Map each value
            values = valueArray.map(v => {
              // If it's already a bigint, return it
              if (typeof v === 'bigint') return v;

              // If it's a BigNumber or similar object with hex
              if (typeof v === 'object' && v !== null && '_hex' in v) {
                return BigInt((v as { _hex: string })._hex);
              }

              // If it's a regular number
              if (typeof v === 'number') {
                return BigInt(v);
              }

              // If it's a numeric string
              if (typeof v === 'string' && /^[0-9]+$/.test(v)) {
                return BigInt(v);
              }

              // For any other case, try toString() if available
              if (v && typeof v.toString === 'function') {
                const str = v.toString();
                if (/^[0-9]+$/.test(str)) {
                  return BigInt(str);
                }
              }

              // Default case
              console.warn('Using default value 0 for:', v);
              return BigInt(0);
            });
          } catch (err) {
            console.error('Error processing values array:', err);
            values = [BigInt(0)]; // Default to single zero value
          }

          return {
            id: proposalId,
            proposer: args.proposer.toLowerCase(),
            description: args.description,
            manufacturerAddress,
            voteStart,
            voteEnd,
            state: Number(state),
            forVotes: ethers.formatEther(votes[1]),
            againstVotes: ethers.formatEther(votes[0]),
            abstainVotes: ethers.formatEther(votes[2]),
            targets: args.targets,
            values,
            calldatas: args.calldatas
          };
        } catch (err) {
          console.error('Error processing proposal:', err);
          return null;
        }
      });

      const fetchedProposals = (await Promise.all(proposalPromises)).filter((p): p is Proposal => p !== null);
      setProposals(fetchedProposals.sort((a, b) => b.voteStart.getTime() - a.voteStart.getTime()));
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Failed to fetch proposals');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const refreshProposals = useCallback(async () => {
    // Clear any existing refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Wait a bit before refreshing to allow the blockchain to update
    refreshTimeoutRef.current = setTimeout(() => {
      fetchProposals();
    }, 2000);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchProposals]);

  // Initial fetch
  useEffect(() => {
    fetchProposals();
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchProposals]);

  return {
    proposals,
    isLoading,
    error,
    refreshProposals
  };
}
