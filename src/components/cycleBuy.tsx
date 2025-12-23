import "@/pages/Home/index.scss";
import React, { useState } from "react";
import abi from "@/Contract/ABI/abi";
import { ethers, formatEther, formatUnits } from "ethers";
import type { ConfigPlus } from "@/ts/configPlus";
import { Button, Dialog, Toast } from "antd-mobile";
interface CycleBuyProps {
  configPlusList: ConfigPlus;
  setConfigPlusList: React.Dispatch<React.SetStateAction<ConfigPlus>>;
}

const CycleBuy: React.FC<CycleBuyProps> = ({
  configPlusList,
  setConfigPlusList,
}) => {
  const provider = new ethers.JsonRpcProvider(
    "https://rpc.juchain.org",
    210000
  );
  const stakeAddress = "0x2f3b94fa48109809F87AE190167027a86888250A"; //合约地址
  const runningRef = React.useRef(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [startupLoading, setStartupLoading] = useState<boolean>(false);
  let contract=null
  // 封装日志方法
  const appendLog = (...msg: any[]) => {
    const text = msg
      .map((m) => (typeof m === "object" ? JSON.stringify(m) : m))
      .join(" ");
    // 最新日志放在最前面
    setLogs((prev) => [text, ...prev]);
  };
  const updateField = (field: string, value: string | number | bigint) => {
    setConfigPlusList((prev) =>
      prev.map((item) => (item.field === field ? { ...item, value } : item))
    );
  };
  function getConfigValue(field: string) {
    return configPlusList.find((i) => i.field === field)?.value;
  }
  const handleUpdateConfig = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setStartupLoading(true);
    startup();
  };
  function stringToArray(input: string | string[]): string[] {
    // 如果已经是数组，直接返回
    if (Array.isArray(input)) return input;
    if (!input) return [];
    return (
      input
        .trim()
        // 按 空格 / 逗号 / 中文逗号 拆分
        .split(/[\s,，]+/)
        .filter(Boolean)
    );
  }
  async function bind(nextId, wallets) {
    const wallet = new ethers.Wallet(wallets[nextId], provider);
    const contract = new ethers.Contract(stakeAddress, abi, wallet);
    const userInfoData = await contract.userInfo(wallet.address);
    if (userInfoData[0] === "0x0000000000000000000000000000000000000000") {
      const tx = await contract.bind(getConfigValue("initInviter"));
      await tx.wait();
      appendLog(`${wallet.address} 绑定成功`);
    }
  }
  async function cycleBuy(nextId: number, wallets) {
    // ❗ 第一行就判断
    if (!runningRef.current) {
      appendLog("抢购 已终止");
      return;
    }
    if (nextId >= wallets.length) {
      nextId = 0;
    }
    const wallet = new ethers.Wallet(wallets[nextId], provider);
    if(contract==null){
       contract = new ethers.Contract(stakeAddress, abi, wallet)
    }
    try {
      let maxStakeAmount = await contract.maxStakeAmount();
      updateField("maxStakeAmountStr", formatEther(maxStakeAmount));
      if (!runningRef.current) return;
      if (maxStakeAmount > getConfigValue("maxAmount")) {
        maxStakeAmount = getConfigValue("maxAmount");
      }
      if (maxStakeAmount >= getConfigValue("minAmount")) {
        const amount =
          Math.random() *
            (getConfigValue("maxAmount") > maxStakeAmount
              ? maxStakeAmount
              : getConfigValue("maxAmount") - getConfigValue("minAmount")) +
          getConfigValue("minAmount");
    
        let depositAmount = Number(amount).toFixed(0);
        if (depositAmount == 0) {
          depositAmount = getConfigValue("minAmount");
        }
        const walletBalance = await provider.getBalance(wallet.address);
        const amountsJuIn = await contract.getAmountsJuIn(
          ethers.parseEther(depositAmount)
        );
        appendLog("用户钱包余额", formatUnits(walletBalance, 18));
        appendLog("购买ju", formatUnits(amountsJuIn, 18));
        if (walletBalance > amountsJuIn) {
          const curr = new Date();
          appendLog(
            "符合购买条件",
            `购买金额 ${formatUnits(amountsJuIn, 18)}`,
            wallet.address,
            curr.getHours() + ":" + curr.getMinutes() + ":" + curr.getSeconds()
          );
          const depositTx = await contract.deposit(
            getConfigValue("days"),
            ethers.parseEther(depositAmount),
            { value: amountsJuIn }
          );
          
          await depositTx.wait();
          appendLog("✅ 抢购成功", wallet.address);
        } else {
          appendLog(
            "WARN 钱包地址余额不足:  钱包: %s 余额: %s 需要JU: %s",
            wallet.address,
            walletBalance,
            amountsJuIn
          );
        }
        nextId++;
      }
    } catch (e) {
      appendLog(`❌ ${wallet.address} 抢购失败`, e);
    }
    // ⏱️ 下一次执行
    let delay = 0;
    if (getConfigValue("buyType") == 0) {
      delay = getConfigValue("buySec") * 1000;
    } else {
      const nextTime = new Date();
      nextTime.setMinutes(new Date().getMinutes() + 1);
      nextTime.setSeconds(getConfigValue("buySec"));
      delay = nextTime.getTime() - Date.now();
    }
    appendLog(`⏱ 下一次执行 ${delay}ms 后`);
    timerRef.current = setTimeout(() => {
      cycleBuy(nextId, wallets);
    }, delay);
  }
  async function startup() {
    appendLog("Startup 地址绑定检查开始");
    //将私钥字符串转化成 数组
    let wallets = stringToArray(getConfigValue("walletsInputs"));
    for (let i = 0; i < wallets.length; i++) {
      await bind(i, wallets);
    }
    appendLog("Startup   地址绑定检查结束");
    cycleBuy(0, wallets);
  }
  const closeConfig = () => {
    runningRef.current = false;
    setStartupLoading(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    appendLog("🛑 已停止抢购");
  };
  const delLog = () => {
    Dialog.confirm({
      content: "是否清空日志",
      onConfirm: async () => {
        setLogs([]);
        Toast.show({
          icon: "success",
          content: "清空成功",
          position: "bottom",
        });
      },
    });
  };
  return (
    <div className="fixedBottom">
      <Button
        color="success"
        className="fixedBottomBtn"
        loading={startupLoading}
        onClick={handleUpdateConfig}
        style={{ marginTop: 16 }}
      >
        开始运行抢购
      </Button>

      <Button
        color="success"
        className="fixedBottomBtn"
        onClick={closeConfig}
        style={{ marginTop: 16 }}
      >
        停止抢购
      </Button>
      <div className="logBox">
        <div className="title">抢购运行日志</div>
        <Button
          className="delBtn"
          onClick={() =>
            Dialog.confirm({
              content: "是否清空日志",
              onConfirm: async () => {
                setLogs([]);
                Toast.show({
                  icon: "success",
                  content: "清空成功",
                  position: "bottom",
                });
              },
            })
          }
        >
          清空日志
        </Button>
      </div>
      <div className="log-content" id="logBox">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};
export default CycleBuy;
