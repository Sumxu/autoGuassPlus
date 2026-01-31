import "@/pages/Home/index.scss";
import React, { useState, useRef } from "react";
import abi from "@/Contract/ABI/abi";
import { ethers, formatEther } from "ethers";
import type { ConfigPlus } from "@/ts/configPlus";
import { Button, Dialog, Toast } from "antd-mobile";
import EnvManager from "@/config/EnvManager";
interface CycleBuyProps {
  configPlusList: ConfigPlus;
  setConfigPlusList: React.Dispatch<React.SetStateAction<ConfigPlus>>;
}

const CycleBuy: React.FC<CycleBuyProps> = ({
  configPlusList,
  setConfigPlusList,
}) => {
  const provider = new ethers.JsonRpcProvider(
    EnvManager.rpcUrl,
    EnvManager.chainId,
  );

  const erc20ABI = [
    "function approve(address,uint256) external",
    "function balanceOf(address) external view returns (uint256)",
    "function allowance(address,address) external view returns (uint256)",
  ];

  const USDTAddress = EnvManager.contractUsdt;
  const stakeAddress = EnvManager.stakeAddress;

  const runningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [startupLoading, setStartupLoading] = useState(false);

  const appendLog = (...msg: any[]) => {
    const text = msg
      .map((m) => (typeof m === "object" ? JSON.stringify(m) : m))
      .join(" ");
    setLogs((prev) => [text, ...prev]);
  };

  const updateField = (field: string, value: string | number | bigint) => {
    setConfigPlusList((prev) =>
      prev.map((item) => (item.field === field ? { ...item, value } : item)),
    );
  };

  const getConfigValue = (field: string) =>
    configPlusList.find((i) => i.field === field)?.value;

  function stringToArray(input: string | string[]): string[] {
    if (Array.isArray(input)) return input;
    if (!input) return [];
    return input
      .trim()
      .split(/[\s,，]+/)
      .filter(Boolean);
  }

  const checkRedeemConfig = (): boolean => {
    const type = Number(getConfigValue("buyType"));
    const buySec = Number(getConfigValue("buySec"));

    if (isNaN(buySec) || buySec < 0) {
      appendLog("❌ 抢购时间配置错误");
      return false;
    }
    if (type === 1 && buySec > 60) {
      appendLog("❌ 每分钟模式秒数必须 ≤ 60");
      return false;
    }
    if (!getConfigValue("initInviter")) {
      appendLog("❌ 邀请人不能为空");
      return false;
    }
    if (stringToArray(getConfigValue("walletsInputs")).length === 0) {
      appendLog("❌ 私钥不能为空");
      return false;
    }
    return true;
  };

  const checkAndApprove = async (pk: string) => {
    const wallet = new ethers.Wallet(pk, provider);
    const token = new ethers.Contract(USDTAddress, erc20ABI, wallet);
    const allowance = await token.allowance(wallet.address, stakeAddress);
    appendLog("钱包开始授权:", wallet.address, "100000 USDT");
    if (allowance < 1000000000000000000000n) {
      const tx = await token.approve(stakeAddress, 100000000000000000000000n);
      await tx.wait();
    }
    appendLog("钱包授权结束:", wallet.address, "100000 USDT");
  };

  async function bind(pk: string) {
    const wallet = new ethers.Wallet(pk, provider);
    const contract = new ethers.Contract(stakeAddress, abi, wallet);
    const user = await contract.userInfo(wallet.address);
    if (user[0] === ethers.ZeroAddress) {
      try {
        const tx = await contract.bind(getConfigValue("initInviter"));
        await tx.wait();
        appendLog(`${wallet.address} 绑定成功`);
      } catch (error) {
        appendLog(`${wallet.address} 绑定失败`, error);
      }
    }
  }

  function scheduleNextRound(wallets: string[]) {
    if (!runningRef.current) return;

    let delay = 0;
    if (getConfigValue("buyType") == 0) {
      delay = Number(getConfigValue("buySec")) * 1000;
    } else {
      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + 1);
      nextTime.setSeconds(Number(getConfigValue("buySec")));
      delay = nextTime.getTime() - Date.now();
    }

    appendLog(`⏱ 下一轮执行 ${delay}ms 后`);
    timerRef.current = setTimeout(() => cycleBuy(0, wallets), delay);
  }

  async function cycleBuy(index: number, wallets: string[]) {
    if (!runningRef.current) return;

    if (index >= wallets.length) {
      appendLog("❌ 本轮全部钱包失败，执行完毕");
      scheduleNextRound(wallets);
      return;
    }

    const wallet = new ethers.Wallet(wallets[index], provider);
    const contract = new ethers.Contract(stakeAddress, abi, wallet);
    const usdt = new ethers.Contract(USDTAddress, erc20ABI, wallet);

    try {
      const maxStake = Number(formatEther(await contract.maxStakeAmount()));
      updateField("maxStakeAmountStr", maxStake);
      const maxAmount = Number(getConfigValue("maxAmount"));
      const minAmount = Number(getConfigValue("minAmount"));
      if (!runningRef.current) return;
      if (maxStake >= Number(maxAmount)) {
        maxStake = maxAmount;
      }
      const amount = Math.floor(
        Math.random() * (maxAmount - minAmount) + minAmount,
      );
      const buyAmount = ethers.parseEther(amount.toString());

      const balance = await usdt.balanceOf(wallet.address);
      if (balance < buyAmount) {
        appendLog(
          `钱包地址余额不足:`,
          `钱包地址${wallet.address}:余额${ethers.parseEther(balance)},需要:${amount}USDT`,
        );
        throw new Error("余额不足");
      }

      const gas = await contract.deposit.estimateGas(
        getConfigValue("days"),
        buyAmount,
      );
      const curr = new Date();
      appendLog(
        "符合购买条件",
        `购买金额 ${amount}`,
        wallet.address,
        curr.getHours() + ":" + curr.getMinutes() + ":" + curr.getSeconds(),
      );

      const tx = await contract.deposit(getConfigValue("days"), buyAmount, {
        gasLimit: (gas * 130n) / 100n,
        gasPrice: ethers.parseUnits("10", "gwei"),
      });

      await tx.wait();
      appendLog("✅ 抢购成功", wallet.address);
      scheduleNextRound(wallets);
    } catch (e) {
      console.log("e---", e);
      appendLog(`❌ ${wallet.address} 失败，切换下一个`, e);
      cycleBuy(index + 1, wallets);
    }
  }

  async function startup() {
    appendLog("启动前必要条件校验 开始");
    if (!checkRedeemConfig()) {
      appendLog("启动前必要条件失败,请重新填参数");
      return;
    }
    appendLog("启动前必要条件校验 结束");
    appendLog("Startup 地址绑定检查开始");
    runningRef.current = true;
    const wallets = stringToArray(getConfigValue("walletsInputs"));

    for (const pk of wallets) {
      appendLog("绑定邀请人开始");
      await bind(pk);
      appendLog("绑定邀请人结束");
      appendLog("授权usdt额度开始");
      await checkAndApprove(pk);
      appendLog("授权usdt额度结束");
    }

    appendLog("✅ 钱包初始化完成");
    cycleBuy(0, wallets);
  }

  const stop = () => {
    runningRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    appendLog("🛑 已停止抢购");
  };

  return (
    <div className="fixedBottom">
      <Button
        color="success"
        className="fixedBottomBtn"
        loading={startupLoading}
        onClick={startup}
        style={{ marginTop: 16 }}
      >
        开始运行抢购
      </Button>

      <Button
        color="success"
        className="fixedBottomBtn"
        onClick={stop}
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
      <div className="log-content">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export default CycleBuy;
