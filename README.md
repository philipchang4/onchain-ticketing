# Onchain Ticketing

Decentralized event ticketing platform on Base. Organizers deploy event contracts via a factory, buyers purchase NFT tickets, and all ownership and rules are enforced onchain.

## Architecture

```
┌──────────────────┐       ┌──────────────────┐
│  TicketFactory   │──────▶│  EventTicket      │  (clone per event)
│  (one instance)  │       │  ERC-721 tickets  │
└──────────────────┘       └──────────────────┘
         │
         │  createEvent()
         │
┌──────────────────┐
│  Next.js App     │
│  wagmi + viem    │
│  RainbowKit      │
└──────────────────┘
```

**TicketFactory** — Deploys minimal-proxy clones of `EventTicket` for each new event. Charges a one-time creation fee.

**EventTicket** — Each instance is one event. Handles ticket sales, redemption, cancellation, refunds, and proceed withdrawal. Supports non-transferable tickets (anti-scalping).

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Setup

```bash
# Install all dependencies
make install

# Copy environment file and fill in values
cp .env.example .env
```

## Development

```bash
# Run contract tests
make test

# Start Next.js dev server
make dev
```

## Deploy Contracts

```bash
# Deploy to Base Sepolia
make deploy-sepolia
```

After deploying, copy the factory contract address into `.env`:

```
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
```

## Project Structure

```
├── contracts/
│   ├── src/
│   │   ├── EventTicket.sol      # Event contract (cloned per event)
│   │   └── TicketFactory.sol    # Factory that deploys event clones
│   ├── test/
│   │   └── OnchainTicketing.t.sol
│   └── script/
│       └── Deploy.s.sol
├── app/                         # Next.js pages
│   ├── page.tsx                 # Home — list events
│   ├── create/page.tsx          # Create new event
│   ├── event/[address]/page.tsx # Event detail + buy
│   └── my-tickets/page.tsx      # User's tickets
├── components/
│   ├── Header.tsx
│   └── EventCard.tsx
└── lib/
    ├── abi/                     # Contract ABIs
    ├── contracts.ts             # Deployed addresses
    └── wagmi.ts                 # Wallet config
```
