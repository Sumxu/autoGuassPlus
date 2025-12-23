const config = {
  days: 0, //0/1/2 表示 1天/15天/30天  //下拉框
  robotType: 0, //0抢购 1赎回
  minAmount: 1, //最小投入金额
  maxAmount: 4, //最大投入金额
  buyAmount: 0, //0 抢购间隔多少秒 1每分钟的多少秒
  buySec: 10, //抢购时间
  maxStakeAmountStr: "", //最大金额
  initInviter: "", //绑定邀请人
  redemType: 0, //0赎回类型 0 间隔多少秒 1每分钟的多少秒
  redemMinSec: 1, //赎回最小时间区间
  redemMaxSec: 3, //赎回最大时间区间
  wallets: [""], //私钥地址列表
  walletsInputs: "", //钱包地址逗号隔开
};
 
export default config;
