# Hashflow — Blockchain-Based Three-Way Invoice Verification System

An enterprise procurement platform that prevents invoice fraud through blockchain-anchored
three-way matching between **Purchase Orders**, **Goods Receipt Notes (GRN)**, and **Vendor
Invoices** — with a rule-based fraud detection engine and a live backend monitor console.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Framer Motion, Lucide Icons, Recharts
- **Backend**: Node.js, Express
- **Database**: MongoDB (via Mongoose) — automatically falls back to an in-memory MongoDB
  instance if no local/remote MongoDB is reachable, so the app runs with zero setup
- **Blockchain**: A simulated SHA-256 hash-chained ledger persisted in MongoDB (used live by the
  app), plus a real **Solidity** `ThreeWayMatch.sol` contract with **Hardhat** + **Ethers.js**
  tooling in `blockchain/` demonstrating the same rules on an EVM chain
- **AI Module**: Rule-based fraud scoring engine (`server/src/services/fraudDetectionService.js`),
  architected so a future ML model can be swapped in behind the same interface

## Project Structure

```
client/       React + Vite SPA (components/ pages/ services/ hooks/ utils/ context/ layouts/)
server/       Express API (controllers/ routes/ models/ middleware/ services/ utils/)
blockchain/   Hardhat project (contracts/ scripts/ test/)
```

## Quick Start

**Easiest — double-click `start.bat`** in the project root (or make a desktop shortcut to it, see
below). It starts both the server and client and opens your browser automatically.

**Manual (from the repository root):**

```bash
npm run install:all   # first time only — installs root, client, server dependencies
npm run dev            # runs the API (port 5000) and the client (port 5173) together
```

### Making a one-click desktop shortcut

1. In File Explorer, right-click `start.bat` → **Show more options** → **Send to** → **Desktop
   (create shortcut)**.
2. (Optional) Rename the shortcut on your desktop to "ChainVerify" and give it a custom icon via
   its Properties.
3. From then on, just double-click that desktop icon to launch everything.

A terminal window will open and must stay open while you use the app — closing it stops the
server and client. The very first launch takes a bit longer (installing/downloading an in-memory
MongoDB the first time); after that it's fast.

Then open **http://localhost:5173**. This app runs in **classroom demo mode**: there are no
per-person accounts. Anyone signs in by typing their own name, picking a role to play
(Procurement Officer / Warehouse Officer / Finance Officer / Vendor / Auditor), and entering the
one shared password everyone in the room uses (`demo123` by default — set `DEMO_PASSWORD` in
`server/.env` to change it). The first login for a given name+role pair creates that identity;
logging in again with the same name and role returns to the same identity.

The server **auto-seeds** a small, deliberately simple demo dataset the first time it starts
against an empty database — six purchase orders, each illustrating exactly one outcome so the
tables are easy to explain out loud:

| PO | Scenario | Result |
|---|---|---|
| PO-DEMO-01 | Fully received, invoice matches | Approved & Paid |
| PO-DEMO-02 | Fully received, invoice matches | Approved, awaiting payment |
| PO-DEMO-03 | Same invoice submitted twice | Second submission Rejected — Duplicate Invoice |
| PO-DEMO-04 | No GRN was ever created | Rejected — Invoice without GRN |
| PO-DEMO-05 | Vendor billed more than the PO amount | Rejected — Amount Mismatch |
| PO-DEMO-06 | Only part of the order was received | Rejected — Quantity Mismatch |

From **Settings → Classroom Demo**, anyone can click **Reset Demo Data** to wipe everything
(including every name/role identity created during the session) and reload this same starter set
— use it between groups or demo runs. The same thing can be done from the command line:

```bash
npm run seed
```

### Using a real MongoDB instead of the in-memory fallback

Copy `server/.env.example` to `server/.env` and point `MONGO_URI` at your MongoDB instance. If it
can't be reached, the server automatically falls back to a temporary in-memory database for that
session (data will not persist across restarts in that case).

## Solidity / Hardhat contract

```bash
cd blockchain
npm install
npm run compile
npm test
```

`contracts/ThreeWayMatch.sol` implements the same three-way match rule on-chain: a PO must exist,
a GRN must exist, the invoice must not be a duplicate, the invoice amount must equal the PO total,
and the GRN quantity must satisfy the PO quantity — otherwise the invoice is rejected.

## Three-Way Match Logic

An invoice is **approved** only if:

1. The linked PO exists
2. The linked GRN exists
3. The invoice is not a duplicate (same invoice number, or the PO was already invoiced)
4. The invoice amount equals the PO total amount
5. The GRN's received quantity satisfies the PO's ordered quantity

Otherwise it is rejected — visualized step-by-step on the **Smart Contract Validation** page.

## Fraud Scenarios Modeled

Duplicate invoice, invoice without GRN, amount mismatch, quantity mismatch, a PO whose stored
total doesn't match `quantity × unitPrice` ("modified PO"), a vendor with multiple recently
flagged invoices, and invoices submitted suspiciously soon after goods receipt.
