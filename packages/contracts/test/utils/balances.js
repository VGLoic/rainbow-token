async function getBalances(addresses) {
  const rawBalances = await Promise.all(
    addresses.map((a) => web3.eth.getBalance(a))
  );
  return rawBalances.map((b) => Number(web3.utils.fromWei(b, "ether")));
}

module.exports = { getBalances };
