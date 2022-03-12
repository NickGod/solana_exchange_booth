# solana_exchange_booth
exchange booth program from solana bootcamp

you need to deploy to solana program to chain first.

Go to prgoram, run `cargo build-bpf`

Follow the instruction and deploy the program to dev net chain. You should get a program ID after deployment.

To test the program you need to build client. First install dependencies for the client app in client folder: `yarn install`
Then run `node index.js <programID>` to run transactions defined in `index.js`.

Currently we would initialize two token accounts, deposit fund to vaultB, and try to exchange certain amount of token from tokenAccountA to tokenAccountB.
