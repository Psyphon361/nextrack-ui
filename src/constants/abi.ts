export const nexTrackABI = [{
  type: 'function',
  name: 'onboardNewManufacturer',
  inputs: [{ type: 'address', name: 'manufacturer' }],
  outputs: [],
  stateMutability: 'nonpayable'
}, {
  type: 'function',
  name: 'getRegisteredManufacturers',
  inputs: [],
  outputs: [{ type: 'address[]' }],
  stateMutability: 'view'
}] as const;
