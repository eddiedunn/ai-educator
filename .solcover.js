module.exports = {
  skipFiles: ['mocks/'],
  providerOptions: {
    allowUnlimitedContractSize: true,
    gas: 0xfffffffffff, // Much higher gas limit
    gasLimit: 0xfffffffffff,
    gasPrice: 0x01
  },
  mocha: {
    timeout: 600000
  }
}; 