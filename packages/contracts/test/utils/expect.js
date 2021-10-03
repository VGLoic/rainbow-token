function expectDecrease(originalAmount, decrease, newAmount, errorMessage) {
  expect(Number.parseFloat(newAmount).toFixed(4)).to.equal(
    Number.parseFloat(originalAmount - decrease).toFixed(4),
    errorMessage
  );
}
function expectIncrease(originalAmount, increase, newAmount, errorMessage) {
  expect(Number.parseFloat(newAmount).toFixed(4)).to.equal(
    Number.parseFloat(originalAmount + increase).toFixed(4),
    errorMessage
  );
}

async function expectRevert(promise, reason) {
  let err;
  try {
    await promise;
  } catch (e) {
    err = e;
  }
  expect(Boolean(err)).to.equal(
    true,
    "No error detected while it was expected."
  );
  expect(Boolean(err.data)).to.equal(
    true,
    `No "data" field on the error while it was expected for a revert. Got error ${err}`
  );
  if (reason) {
    expect(err.reason).to.equal(reason);
  }
}

module.exports = {
  expectDecrease,
  expectIncrease,
  expectRevert,
};
