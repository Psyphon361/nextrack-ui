# NexTrack - Next Gen Supply Chain Tracking on Blockchain

NexTrack is a decentralized supply chain management platform built for the Web3 era. This project was developed as part of Electroneum Hackathon 2025 to demonstrate the power of blockchain technology in revolutionizing supply chain transparency and traceability.

## 🌟 Features

- 🔗 Blockchain-based supply chain tracking
- 📦 Batch registration and management
- 🏪 Marketplace for product trading
- 📱 Modern UI built with Next.js
- 🖼️ IPFS integration for decentralized file storage
- 🔐 Web3 authentication using WalletConnect

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Web3 wallet (MetaMask or Rabby recommended)
- [Pinata](https://www.pinata.cloud/) account for IPFS storage

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/Psyphon361/nextrack-ui.git
cd nextrack-ui
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_RPC_URL=your_chain_rpc_url
NEXT_PUBLIC_CHAIN_ID=your_chain_id
NEXT_PUBLIC_NEXTRACK_ADDRESS=nextrack_contract_address
NEXT_PUBLIC_GOVERNOR_ADDRESS=governor_contract_address
NEXT_PUBLIC_GOVTOKEN_ADDRESS=govtoken_contract_address
NEXT_PUBLIC_MUSDT_ADDRESS=musdt_contract_address
NEXT_PUBLIC_VAULT_ADDRESS=vault_contract_address
```

> **Important**: You'll need to obtain a JWT token from your Pinata dashboard. This is required for IPFS file storage functionality. You can create free account at [Pinata](https://www.pinata.cloud/).

### Development

To run the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## 🌐 Try NexTrack Live

Want to experience NexTrack in action? You can try the live demo hosted at [NexTrack](https://nextrack-ui.vercel.app/) on the Electroneum Mainnet. Explore the decentralized supply chain tracking features and see the Web3 integration for yourself!

To help you get started, I’ve also hosted an Electroneum mainnet faucet at [Faucet](https://electroneum-faucet.vercel.app/). This faucet provides 0.5 ETN and 10,000 mUSDT (mock USDT) so you can test the dapp without needing your own funds. Simply visit the faucet, enter your wallet address, and claim your tokens!

## 🏗️ Project Structure

- `/src/app` - Next.js application routes and pages
- `/src/components` - Reusable React components
- `/contracts` - Smart contract related files
- `/public` - Static assets

## 🔧 Tech Stack

- **Frontend Framework**: Next.js 15.1
- **Smart Contract Integration**: ethers.js, wagmi
- **Authentication**: Web3Modal
- **UI Components**: TailwindCSS, Framer Motion
- **File Storage**: IPFS (via Pinata)
- **State Management**: TanStack Query (React Query)

## 🤝 Contributing

This project was created for [Electroneum Hackathon 2025](https://electroneum-hackathon-2025.devpost.com/), but contributions are welcome! Please feel free to submit issues and pull requests.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework for Production
- [WalletConnect](https://walletconnect.com/) - Web3 Authentication
- [Pinata](https://www.pinata.cloud/) - IPFS Storage Solutions
- [Vercel](https://vercel.com/) - Deployment Platform

---

Built with ❤️ for the Web3 community
