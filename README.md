# Wallet Hooks

Specialised TypeScript hook/util library for apps that integrate with a wallet.

This repo is intentionally small and opinionated. It is designed to be consumed by an application (e.g. a Next.js app) which provides runtime/build-time configuration.

## Installation

```bash
npm i git+https://github.com/kjartan221/data-from-wallet
```

## Exports

- `getDataFromWallet`

## getDataFromWallet

Fetches profile data from a wallet by:

- Checking for a profile certificate by `profileType`
- Decrypting profile certificate fields
- Reading the latest profile token output from a `basket`
- Optionally checking additional “connection” certificates (by `connectionTypes`) passed in via options

### Usage

```ts
import { getDataFromWallet } from '@data-from-wallet';

const result = await getDataFromWallet(userWallet, {
  certifiers: [
    process.env.NEXT_PUBLIC_PROFILE_CERTIFIER_KEY,
  ].filter(Boolean) as string[],
  profileType: process.env.NEXT_PUBLIC_PROFILE_CERT_TYPE,
  basket: process.env.NEXT_PUBLIC_PROFILE_BASKET,
  connectionTypes: [
    process.env.NEXT_PUBLIC_CERT_TYPE_LINKEDIN,
    process.env.NEXT_PUBLIC_CERT_TYPE_TWITTER,
  ].filter(Boolean) as string[],
});

if (!result.success) {
  // result.errors is a map of error groups -> list of messages
  console.log(result.errors);
  return;
}

const profile = result.data;
```

### Return value

`getDataFromWallet` returns:

- `success`: boolean
- `data`: profile data on success, otherwise `null`
- `errors?`: optional map of error groups to messages

## Development

```bash
npm run build
npm run dev
```
