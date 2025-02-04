import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const GOVERNOR_ADDRESS = '0xC4d949Ad881f8BCe2532E60585c483D4Ecd45352';
const RPC_URL = 'https://rpc.ankr.com/electroneum_testnet/15266e093685caca47b9a524ba83c22259a0590c105a2b4c5c5b2a7c2d0c7f0c';
const BLOCK_TIME = 5; // Electroneum block time in seconds

export enum ProposalState {
  Pending,
  Active,
  Canceled,
  Defeated,
  Succeeded,
  Queued,
  Expired,
  Executed
}

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
    "inputs": [{"type": "uint256", "name": "proposalId"}],
    "outputs": [{"type": "uint8"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "proposalVotes",
    "inputs": [{"type": "uint256", "name": "proposalId"}],
    "outputs": [
      {"type": "uint256", "name": "againstVotes"},
      {"type": "uint256", "name": "forVotes"},
      {"type": "uint256", "name": "abstainVotes"}
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

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Setting up ethers provider and contract...');
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(GOVERNOR_ADDRESS, governorABI, provider);

        // Get all ProposalCreated events
        const filter = contract.filters.ProposalCreated();
        const events = await contract.queryFilter(filter);

        // Process each proposal
        const proposalPromises = events.map(async (event) => {
          const args = event.args;
          if (!args) return null;

          const proposalId = args.proposalId.toString();
          const manufacturerAddress = extractManufacturerAddress(args.calldatas[0]);

          const { voteStart, voteEnd } = await calculateVoteTiming(
            provider,
            BigInt(args.startBlock),
            BigInt(args.endBlock)
          );

          // Get proposal state
          const state = await contract.state(proposalId);

          // Get proposal votes
          const votes = await contract.proposalVotes(proposalId);

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
            abstainVotes: ethers.formatEther(votes[2])
          };
        });

        const fetchedProposals = (await Promise.all(proposalPromises)).filter((p): p is Proposal => p !== null);
        setProposals(fetchedProposals.sort((a, b) => b.voteStart.getTime() - a.voteStart.getTime()));
      } catch (err) {
        console.error('Error fetching proposals:', err);
        setError('Failed to fetch proposals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const refreshProposals = async () => {
    setIsLoading(true);
    setProposals([]);
    setError(null);

    try {
      console.log('Setting up ethers provider and contract...');
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(GOVERNOR_ADDRESS, governorABI, provider);

      // Get all ProposalCreated events
      const filter = contract.filters.ProposalCreated();
      const events = await contract.queryFilter(filter);

      // Process each proposal
      const proposalPromises = events.map(async (event) => {
        const args = event.args;
        if (!args) return null;

        const proposalId = args.proposalId.toString();
        const manufacturerAddress = extractManufacturerAddress(args.calldatas[0]);

        const { voteStart, voteEnd } = await calculateVoteTiming(
          provider,
          BigInt(args.startBlock),
          BigInt(args.endBlock)
        );

        // Get proposal state
        const state = await contract.state(proposalId);

        // Get proposal votes
        const votes = await contract.proposalVotes(proposalId);

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
          abstainVotes: ethers.formatEther(votes[2])
        };
      });

      const fetchedProposals = (await Promise.all(proposalPromises)).filter((p): p is Proposal => p !== null);
      setProposals(fetchedProposals.sort((a, b) => b.voteStart.getTime() - a.voteStart.getTime()));
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Failed to fetch proposals');
    } finally {
      setIsLoading(false);
    }
  };

  return { proposals, isLoading, error, refreshProposals };
}
