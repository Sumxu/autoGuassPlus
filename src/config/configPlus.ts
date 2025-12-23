import type { ConfigPlus } from "@/ts/configPlus";
const configPlus: ConfigPlus = [
   {
    label: "选择模式",
    type: "Radio",
    field: "robotType",
    value: "0",
    isShow: false,
    array: [
      {
        label: "抢购模式",
        value: "0",
      },
      {
        label: "赎回模式",
        value: "1",
      },
    ],
  },
  {
    label: "天数(0/1/2 表示 1天/15天/30天 )",
    field: "days",
    value: "0",
    type: "picker",
    pickerShow: false, //是否展示
    array: [
      [
        { label: "1天", value: "0" },
        { label: "15天", value: "1" },
        { label: "30天", value: "2" },
      ],
    ],
    isShow: false,
  },
  {
    label: "抢购最大购买金额",
    field: "maxStakeAmountStr",
    value: "0",
    type: "formatEther",
    isShow: false,
  },
  {
    label: "抢购最小投入金额",
    field: "minAmount",
    value: "1",
    type: "input",
    isShow: false,
    placeholder: "请输入抢购最小金额",
  },
    {
    label: "抢购最大投入金额",
    field: "maxAmount",
    value: "20",
    type: "input",
    isShow: false,
    placeholder: "请输入抢购最大投入金额",
  },
  {
    label: "抢购间隔类型",
    type: "Radio",
    field: "buyType",
    value: "0",
    isShow: false,
    array: [
      {
        label: "间隔多少秒",
        value: "0",
      },
      {
        label: "每分钟中的第X秒",
        value: "1",
      },
    ],
  },
    {
    label: "抢购间隔时间",
    type: "input",
    isShow: false,
    field: "buySec",
    value: "3",
    placeholder: "请输入抢购间隔时间",
  },
  {
    label: "赎回间隔类型(输入最小值和最大值后会取区间去进行赎回)",
    field: "redemType",
    value: "0",
    type: "Radio",
    isShow: false,
    array: [
      {
        label: "赎回间隔多少秒",
        value: "0",
      },
      {
        label: "赎回每分钟中的第X秒",
        value: "1",
      },
    ],
  },
  {
    label: "赎回时间最小值",
    type: "input",
    isShow: false,
    field: "redemMinSec",
    value: "1",
    placeholder: "请输入赎回时间最小值",
  },
  {
    label: "赎回时间最大值",
    type: "input",
    isShow: false,
    field: "redemMaxSec",
    value: "20",
    placeholder: "请输入赎回时间最大值",
  },
  {
    label: "绑定邀请人",
    type: "input",
    field: "initInviter",
    value: "",
    isShow: false,
    placeholder: "请输入绑定邀请人钱包地址",
  },
  {
    label: "私钥列表使用,隔开案例(私钥地址,私钥地址)",
    type: "TextArea",
    isShow: false,
    rows: 20,
    field: "walletsInputs",
    value: "",
    placeholder: "私钥列表",
  },
];
export default configPlus;
