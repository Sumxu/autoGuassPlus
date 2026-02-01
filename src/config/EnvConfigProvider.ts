// src/config/EnvConfigProvider.ts

/** 环境配置接口（已去掉 VITE_ 前缀，字段名更友好） */
export interface EnvConfig {
  contractUsdt: string;
  chainId: number;
  rpcUrl: string;
  stakeAddress: string;
  multiCallToken: string;
}

/** 环境配置提供类：集中维护 dev / prod 原始值 */
export default class EnvConfigProvider {
  /** 开发环境配置（测试网） */
  static getDevConfig(): EnvConfig {
    return {
      contractUsdt: "0x2551E01a708A41990D75513B4Cbe7aC4cFAA94aA",
      stakeAddress: "0x3303040fB033b25CA618C76aaD356290c0C71E0b",
      multiCallToken: "0x68ef1A6CB7dB362821EE4f9971c10F8D6e250A74",
      rpcUrl: "https://testnet-rpc.juchain.org",
      chainId: 202599,
    };
  }
  /** 生产环境配置（主网） */
  static getProdConfig(): EnvConfig {
    return {
      contractUsdt: "0xc8e19c19479a866142b42fb390f2ea1ff082e0d2",
      stakeAddress: "0x2f3b94fa48109809F87AE190167027a86888250A",
      multiCallToken: "0x1d3C076d568F3dCaF3CBbecbd724Fc901c9fCf81",
      rpcUrl: "https://rpc.juchain.org",
      chainId: 210000,
    };
  }
}
