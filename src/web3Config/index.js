// Abis
import { abi as RainbowTokenAbi } from './abis/RainbowToken.json'

export default {
  defaultProvider: 'wss://ropsten.infura.io/ws',
  contracts: [
    {
      name: 'RainbowToken',
      abi: RainbowTokenAbi,
      // Dev
      // address: '0xC61431eb6c69189F844A595234Ce331B7C8A7A77',
      // Ropsten
      address: '0xc9eb99645B4d9BDef879FA433d475a05649AAC08'
      // address: '0x618E3D5d6a6c28064cdEeD5E1116554b6cD687Cc'
      // address: '0xc0149Bee5AE61553506192ca8Eb876Ec7E6aeBFf'
      // address: '0x1266af25494414936AF6c9778EDDCE7ce3dedcd5'
      // address: '0x09e406e528fEa8190a091830e6935dBc12624AE2'
    },
  ]
}
