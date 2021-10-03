# Rainbow Token Smart Contracts

## Installation and setup

This is a sub-package of the monoropo, it is strongly advised to follow the installation step at the monoropeo level.

## Repository

Here is an organisation of the various folders:

- `contracts`: smart contracts,
- `migrations`: migrations for the smart contracts
- `test`: tests of the smart contracts

## Available scripts

### Launch a development network

```
yarn ganache
```

### Compile the smart contracts

```
yarn compile
```

### Launch the tests on the development network

```
yarn test
```

### Deploy on the development network

```
yarn deploy:dev
```

### Launch the tests with cover

```
yarn test:cover
```

## Format `.sol` and `.js` files

```
yarn format
```
