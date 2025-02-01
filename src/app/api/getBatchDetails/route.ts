import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import NexTrackContract from '@/abis/NexTrack.json';

export async function POST(request: Request) {
  try {
    const { batchId, contractAddress } = await request.json();

    const client = createPublicClient({
      transport: http()
    });

    const data = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: NexTrackContract.abi,
      functionName: 'getBatchDetails',
      args: [BigInt(batchId)],
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching batch details:', error);
    return NextResponse.json({ error: 'Failed to fetch batch details' }, { status: 500 });
  }
}
